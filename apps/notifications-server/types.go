package main

import "time"

// TelegramMessage represents a message to save to the backend
type TelegramMessage struct {
	Text      string    `json:"text"`
	Sender    string    `json:"sender"`
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"` // "text", "image", "video", "audio"
	MediaURL  string    `json:"mediaUrl"`
	ChatID    string    `json:"chatId"`
}

// ThreadCreationRequest for creating new telegram threads
type ThreadCreationRequest struct {
	TelegramChatID string `json:"telegramChatId"`
	Language       string `json:"language"`
}

// ThreadCreationResponse from the backend
type ThreadCreationResponse struct {
	Success  bool   `json:"success"`
	ThreadID string `json:"threadId,omitempty"`
	Message  string `json:"message,omitempty"`
}

// MessageSaveResponse from the backend
type MessageSaveResponse struct {
	Success      bool          `json:"success"`
	SavedMessage *SavedMessage `json:"savedMessage,omitempty"`
	Message      string        `json:"message,omitempty"`
}

// SavedMessage represents a message saved in the database
type SavedMessage struct {
	ID             string    `json:"_id"`
	TelegramChatID string    `json:"telegramChatId"`
	Text           string    `json:"text"`
	Sender         string    `json:"sender"`
	Timestamp      time.Time `json:"timestamp"`
	Type           string    `json:"type"`
	MediaURL       string    `json:"mediaUrl"`
}

// IntakeURLResponse for /url command
type IntakeURLResponse struct {
	Token string `json:"token"`
}

// FollowUpThread represents a thread needing follow-up
type FollowUpThread struct {
	ID       string            `json:"_id"`
	ChatID   string            `json:"chatId"`
	Messages []TelegramMessage `json:"messages,omitempty"`
}

// FollowUpResponse from CRON endpoint
type FollowUpResponse struct {
	FollowUps []FollowUpThread `json:"followUps"`
}

// LinkPatientRequest for linking a patient to a Telegram chat via code
type LinkPatientRequest struct {
	Code           string `json:"code"`
	TelegramChatID string `json:"telegramChatId"`
}

// LinkPatientResponse from the backend
type LinkPatientResponse struct {
	Success     bool   `json:"success"`
	Pending     bool   `json:"pending,omitempty"`
	PatientID   string `json:"patientId,omitempty"`
	PatientName string `json:"patientName,omitempty"`
	SkipIntake  bool   `json:"skipIntake,omitempty"`
	Error       string `json:"error,omitempty"`
	BotMessage  string `json:"botMessage,omitempty"` // Localized message for the bot to send
}

// DeviceToken is one row of push_devices.
//
// Environment matters: an APNs token minted by a Debug build is only valid
// against the sandbox gateway, and a Release build's only against production.
// Sending to the wrong one returns BadDeviceToken, so the environment has to
// travel with the token all the way to the Gorush instance that serves it.
type DeviceToken struct {
	Token string `json:"token"`
	// "ios", "android", or "ios_voip". A PushKit token is a different token
	// from the same device, so it is its own row — which is also what keeps
	// alert pushes from ever targeting a VoIP token.
	Platform string `json:"platform"`
	// "dev" or "prod", as registered by POST /api/user/device-token.
	Environment string `json:"environment"`
}

// UserSettings represents user settings from the database
type UserSettings struct {
	UserID                   string        `json:"user_id"`
	Devices                  []DeviceToken `json:"devices"`
	PushNotificationsEnabled bool          `json:"push_notifications_enabled"`
}

// AlertDevices returns the devices that should receive a normal alert push —
// everything except VoIP tokens, which only ever carry call invites.
func (s *UserSettings) AlertDevices() []DeviceToken {
	out := make([]DeviceToken, 0, len(s.Devices))
	for _, d := range s.Devices {
		if d.Platform == "ios_voip" {
			continue
		}
		if d.Token == "" {
			continue
		}
		out = append(out, d)
	}
	return out
}

// VoipDevices returns only the PushKit tokens, used to ring an incoming call.
func (s *UserSettings) VoipDevices() []DeviceToken {
	out := make([]DeviceToken, 0, len(s.Devices))
	for _, d := range s.Devices {
		if d.Platform == "ios_voip" && d.Token != "" {
			out = append(out, d)
		}
	}
	return out
}

// PushNotification represents a notification to send
type PushNotification struct {
	UserID  string            `json:"user_id"`
	Title   string            `json:"title"`
	Message string            `json:"message"`
	Data    map[string]string `json:"data,omitempty"`
}
