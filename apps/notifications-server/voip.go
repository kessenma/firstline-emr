package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/sideshow/apns2"
	"github.com/sideshow/apns2/token"
)

// VoIP (PushKit) delivery, used to ring an incoming staff call.
//
// Deliberately NOT routed through Gorush, for two reasons:
//
//  1. Gorush runs with sync=false, so it answers before APNs does. A VoIP push
//     that fails has to downgrade the call to "not reachable" immediately, and
//     for that the caller needs the actual APNs reason code.
//  2. A dead PushKit token must be deactivated. APNs reports that as
//     Unregistered/BadDeviceToken per token, which a fire-and-forget relay
//     cannot surface.
//
// apns2 also lets one client serve both gateways by construction, so the
// sandbox/production split that forced two Gorush instances is a non-issue here.

// voipTopicSuffix is appended to the bundle id. PushKit uses its own APNs topic.
const voipTopicSuffix = ".voip"

// VoipPusher sends PushKit notifications straight to APNs.
type VoipPusher struct {
	prodClient    *apns2.Client
	sandboxClient *apns2.Client
	topic         string
}

// NewVoipPusher builds a PushKit client from the same credentials Gorush uses:
// the base64 AuthKey.p8 plus the key/team ids.
//
// Returns nil (with a logged warning) rather than an error when unconfigured —
// a missing VoIP path must degrade calls to "not reachable", not stop the whole
// notifications server from booting.
func NewVoipPusher() *VoipPusher {
	keyB64 := os.Getenv("APNS_KEY_BASE64")
	keyID := os.Getenv("GORUSH_IOS_KEY_ID")
	teamID := os.Getenv("GORUSH_IOS_TEAM_ID")

	if keyB64 == "" || keyID == "" || teamID == "" {
		log.Println("⚠️ VoIP push disabled: APNS_KEY_BASE64 / GORUSH_IOS_KEY_ID / GORUSH_IOS_TEAM_ID not all set")
		return nil
	}

	raw, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil {
		log.Printf("❌ VoIP push disabled: APNS_KEY_BASE64 is not valid base64: %v", err)
		return nil
	}

	authKey, err := token.AuthKeyFromBytes(raw)
	if err != nil {
		log.Printf("❌ VoIP push disabled: could not parse AuthKey.p8: %v", err)
		return nil
	}

	tok := &token.Token{AuthKey: authKey, KeyID: keyID, TeamID: teamID}

	return &VoipPusher{
		prodClient:    apns2.NewTokenClient(tok).Production(),
		sandboxClient: apns2.NewTokenClient(tok).Development(),
		topic:         bundleTopic + voipTopicSuffix,
	}
}

// clientFor picks the APNs gateway matching the environment the token was
// registered under. A token minted by a Debug build only works against the
// development gateway, and vice versa — sending to the wrong one returns
// BadDeviceToken.
func (v *VoipPusher) clientFor(environment string) *apns2.Client {
	if environment == "dev" || environment == "sandbox" {
		return v.sandboxClient
	}
	return v.prodClient
}

// VoipPushResult mirrors what apps/web/lib/voipPush.ts expects back.
type VoipPushResult struct {
	Delivered int `json:"delivered"`
	Failed    int `json:"failed"`
}

// SendCallPush rings (or cancels) a call on every VoIP token a user has
// registered. A user with two devices gets two pushes; CallKit on each decides
// what to draw.
//
// Every payload value is a string — the JS side types it that way and the
// native handler reads it as such.
func (v *VoipPusher) SendCallPush(
	ctx context.Context,
	db *sql.DB,
	userID string,
	payload map[string]string,
) (VoipPushResult, error) {
	settings, err := GetUserDeviceTokens(ctx, db, userID)
	if err != nil {
		// No registered device at all is a normal outcome, not an error: the
		// caller renders "not reachable".
		return VoipPushResult{}, nil
	}

	devices := settings.VoipDevices()
	if len(devices) == 0 {
		log.Printf("ℹ️ No VoIP tokens registered for user %s", userID)
		return VoipPushResult{}, nil
	}

	body, err := buildVoipPayload(payload)
	if err != nil {
		return VoipPushResult{}, err
	}

	var (
		mu     sync.Mutex
		result VoipPushResult
		wg     sync.WaitGroup
	)

	for _, device := range devices {
		wg.Add(1)
		go func(d DeviceToken) {
			defer wg.Done()

			notification := &apns2.Notification{
				DeviceToken: d.Token,
				Topic:       v.topic,
				PushType:    apns2.PushTypeVOIP,
				// 10 = immediate. A ring that APNs coalesces is a missed call.
				Priority: apns2.PriorityHigh,
				// A ring is worthless once stale; do not let APNs hold it.
				Expiration: expiryForVoip(),
				Payload:    body,
			}

			res, err := v.clientFor(d.Environment).PushWithContext(ctx, notification)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				result.Failed++
				log.Printf("❌ VoIP push transport error for user %s (%s): %v", userID, d.Environment, err)
				return
			}

			if res.Sent() {
				result.Delivered++
				return
			}

			result.Failed++
			log.Printf("❌ VoIP push rejected for user %s (%s): %d %s", userID, d.Environment, res.StatusCode, res.Reason)

			// APNs is telling us this token is dead. Leaving it active means
			// every future call wastes a round trip and reports a phantom ring.
			if res.Reason == apns2.ReasonUnregistered || res.Reason == apns2.ReasonBadDeviceToken {
				deactivateDeviceToken(ctx, db, d.Token)
			}
		}(device)
	}

	wg.Wait()
	return result, nil
}

// deactivateDeviceToken flips is_active off for a token APNs has rejected as
// permanently invalid.
func deactivateDeviceToken(ctx context.Context, db *sql.DB, deviceToken string) {
	_, err := db.ExecContext(ctx,
		`UPDATE push_devices SET is_active = false, updated_at = NOW() WHERE token = $1`,
		deviceToken)
	if err != nil {
		log.Printf("⚠️ Failed to deactivate dead token %s: %v", truncateToken(deviceToken), err)
		return
	}
	log.Printf("🧹 Deactivated dead VoIP token %s", truncateToken(deviceToken))
}

// buildVoipPayload wraps the call fields in the shape the native PushKit
// handler reads.
func buildVoipPayload(payload map[string]string) (voipPayload, error) {
	if payload["callId"] == "" || payload["event"] == "" {
		return voipPayload{}, fmt.Errorf("payload must contain callId and event")
	}
	return voipPayload{Call: payload}, nil
}

// voipPayload is the JSON body delivered to PushKit. Keyed under "call" so the
// native side can tell a call push from anything else Apple may deliver on the
// same topic later.
type voipPayload struct {
	Call map[string]string `json:"call"`
}

// expiryForVoip yields an apns-expiration header of 0, meaning "attempt
// delivery once and do not store". A stored-and-retried ring would raise a
// CallKit UI for a call that ended minutes ago.
//
// time.Unix(0, 0) rather than the zero Time: apns2 omits the header entirely
// for a zero Time, which selects APNs' store-and-retry default — the opposite
// of what a live ring wants.
func expiryForVoip() time.Time {
	return time.Unix(0, 0)
}
