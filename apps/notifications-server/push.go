package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"github.com/lib/pq"
)

// GetUserDeviceTokens retrieves all device tokens for a specific user from push_devices table
func GetUserDeviceTokens(ctx context.Context, db *sql.DB, userID string) (*UserSettings, error) {
	// No environment filter: the environment is returned and routed on, rather
	// than hardcoded. Filtering to 'prod' here is what made Debug builds — the
	// only way to test CallKit on a real device — silently receive nothing.
	query := `
		SELECT
			token,
			platform,
			COALESCE(environment, 'prod')
		FROM push_devices
		WHERE user_id = $1
		AND is_active = true
	`

	rows, err := db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query push_devices: %w", err)
	}
	defer rows.Close()

	settings := &UserSettings{
		UserID:                   userID,
		PushNotificationsEnabled: true,
		Devices:                  []DeviceToken{},
	}

	for rows.Next() {
		var d DeviceToken
		if err := rows.Scan(&d.Token, &d.Platform, &d.Environment); err != nil {
			log.Printf("⚠️ Failed to scan push_devices row: %v", err)
			continue
		}
		settings.Devices = append(settings.Devices, d)
	}

	if len(settings.Devices) == 0 {
		return nil, fmt.Errorf("no active device tokens found for user %s", userID)
	}

	log.Printf("📱 Found %d device token(s) for user %s", len(settings.Devices), userID)

	return settings, nil
}

// GetMultipleUsersDeviceTokens retrieves device tokens for multiple users from push_devices table
func GetMultipleUsersDeviceTokens(ctx context.Context, db *sql.DB, userIDs []string) (map[string]*UserSettings, error) {
	if len(userIDs) == 0 {
		return make(map[string]*UserSettings), nil
	}

	query := `
		SELECT
			user_id,
			token,
			platform,
			COALESCE(environment, 'prod')
		FROM push_devices
		WHERE user_id = ANY($1)
		AND is_active = true
	`

	rows, err := db.QueryContext(ctx, query, pq.Array(userIDs))
	if err != nil {
		return nil, fmt.Errorf("failed to query push_devices: %w", err)
	}
	defer rows.Close()

	results := make(map[string]*UserSettings)

	for rows.Next() {
		var userID string
		var d DeviceToken
		if err := rows.Scan(&userID, &d.Token, &d.Platform, &d.Environment); err != nil {
			log.Printf("⚠️ Failed to scan push_devices row: %v", err)
			continue
		}

		if _, exists := results[userID]; !exists {
			results[userID] = &UserSettings{
				UserID:                   userID,
				PushNotificationsEnabled: true,
				Devices:                  []DeviceToken{},
			}
		}

		results[userID].Devices = append(results[userID].Devices, d)
	}

	return results, nil
}

// SendPushNotification sends a push notification to a user's devices
func SendPushNotification(ctx context.Context, db *sql.DB, pusher *GorushPusher, notification *PushNotification) error {
	// Get user's device tokens
	settings, err := GetUserDeviceTokens(ctx, db, notification.UserID)
	if err != nil {
		return fmt.Errorf("failed to get device tokens: %w", err)
	}

	if !settings.PushNotificationsEnabled {
		log.Printf("ℹ️ Push notifications disabled for user %s", notification.UserID)
		return nil
	}

	sentCount := 0

	// VoIP tokens are excluded here — they only ever carry call invites, and an
	// alert push to a PushKit token is silently dropped by APNs.
	for _, device := range settings.AlertDevices() {
		var err error
		switch device.Platform {
		case "ios":
			err = pusher.SendToiOS(device.Token, device.Environment, notification.Title, notification.Message, notification.Data)
		case "android":
			err = pusher.SendToAndroid(device.Token, notification.Title, notification.Message, notification.Data)
		default:
			continue
		}

		if err != nil {
			log.Printf("❌ Failed to send to %s device %s (%s): %v", device.Platform, truncateToken(device.Token), device.Environment, err)
		} else {
			sentCount++
			log.Printf("✅ Sent to %s device %s (%s)", device.Platform, truncateToken(device.Token), device.Environment)
		}
	}

	if sentCount == 0 {
		return fmt.Errorf("no devices to send to for user %s", notification.UserID)
	}

	log.Printf("✅ Push notification sent to %d device(s) for user %s", sentCount, notification.UserID)
	return nil
}

// SendPushNotifications sends push notifications to multiple users
func SendPushNotifications(ctx context.Context, db *sql.DB, pusher *GorushPusher, notifications []*PushNotification) error {
	if len(notifications) == 0 {
		return nil
	}

	// Collect unique user IDs
	userIDs := make([]string, 0, len(notifications))
	userIDSet := make(map[string]bool)
	notificationsByUser := make(map[string][]*PushNotification)

	for _, notif := range notifications {
		if !userIDSet[notif.UserID] {
			userIDs = append(userIDs, notif.UserID)
			userIDSet[notif.UserID] = true
		}
		notificationsByUser[notif.UserID] = append(notificationsByUser[notif.UserID], notif)
	}

	// Bulk fetch device tokens
	settingsMap, err := GetMultipleUsersDeviceTokens(ctx, db, userIDs)
	if err != nil {
		return fmt.Errorf("failed to get device tokens: %w", err)
	}

	totalSent := 0

	// Send notifications
	for userID, userNotifications := range notificationsByUser {
		settings, exists := settingsMap[userID]
		if !exists {
			log.Printf("⚠️ No settings found for user %s", userID)
			continue
		}

		if !settings.PushNotificationsEnabled {
			log.Printf("ℹ️ Push notifications disabled for user %s", userID)
			continue
		}

		// Send all notifications for this user to all their devices
		for _, notification := range userNotifications {
			for _, device := range settings.AlertDevices() {
				var err error
				switch device.Platform {
				case "ios":
					err = pusher.SendToiOS(device.Token, device.Environment, notification.Title, notification.Message, notification.Data)
				case "android":
					err = pusher.SendToAndroid(device.Token, notification.Title, notification.Message, notification.Data)
				default:
					continue
				}

				if err != nil {
					log.Printf("❌ Failed to send to %s (%s): %v", device.Platform, device.Environment, err)
				} else {
					totalSent++
				}
			}
		}
	}

	log.Printf("✅ Sent %d push notifications to %d user(s)", totalSent, len(userIDs))
	return nil
}

// truncateToken shortens a device token for logging. Tokens are credentials —
// never log them whole.
func truncateToken(token string) string {
	if len(token) <= 10 {
		return token
	}
	return token[:10] + "..."
}
