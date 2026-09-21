package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const (
	// APNs topic for normal alert pushes — the app's bundle identifier.
	bundleTopic = "com.fajr.emr"
)

// GorushNotification represents a notification to be sent via gorush API
type GorushNotification struct {
	Tokens   []string               `json:"tokens"`
	Platform int                    `json:"platform"` // 1=iOS, 2=Android
	Title    string                 `json:"title,omitempty"`
	Message  string                 `json:"message"`
	Topic    string                 `json:"topic,omitempty"` // iOS bundle ID (required for APNs token auth)
	Sound    string                 `json:"sound,omitempty"`
	Badge    int                    `json:"badge,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	// apns-push-type. Must be "voip" for a PushKit push; APNs rejects a VoIP
	// payload sent as the default "alert" type.
	PushType string `json:"push_type,omitempty"`
	// APNs priority. 10 = deliver immediately, which is what a ringing call
	// needs; the default would let APNs coalesce or delay it.
	Priority string `json:"priority,omitempty"`
}

// GorushRequest is the request payload for gorush API
type GorushRequest struct {
	Notifications []GorushNotification `json:"notifications"`
}

// GorushResponse is the response from gorush API
type GorushResponse struct {
	Success string `json:"success"`
	Counts  int    `json:"counts"`
	Logs    []struct {
		Type     string `json:"type"`
		Platform string `json:"platform"`
		Token    string `json:"token"`
		Message  string `json:"message"`
		Error    string `json:"error"`
	} `json:"logs"`
}

// GorushPusher handles communication with gorush.
//
// Two instances, not one: a single Gorush process is bound to exactly one APNs
// environment (GORUSH_IOS_PRODUCTION is a boolean at startup), and an APNs
// token minted by a Debug build is only valid against the sandbox gateway.
// Serving both means running both and routing per token.
type GorushPusher struct {
	prodURL    string
	sandboxURL string
	httpClient *http.Client
}

// NewGorushPusher creates a new push notification client.
//
// sandboxURL may be empty — dev tokens then fall back to the production
// instance, which reproduces the old behaviour (and its BadDeviceToken
// failures) rather than dropping the push silently.
func NewGorushPusher(prodURL, sandboxURL string) *GorushPusher {
	if prodURL == "" {
		prodURL = "http://gorush:8088"
	}
	return &GorushPusher{
		prodURL:    prodURL,
		sandboxURL: sandboxURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// baseURLFor picks the Gorush instance bound to the APNs environment this
// token was minted in.
func (p *GorushPusher) baseURLFor(environment string) string {
	if (environment == "dev" || environment == "sandbox") && p.sandboxURL != "" {
		return p.sandboxURL
	}
	return p.prodURL
}

// SendNotification sends a push notification to the specified device tokens
func (p *GorushPusher) SendNotification(tokens []string, platform int, environment string, title, message string, data map[string]interface{}) error {
	if len(tokens) == 0 {
		return fmt.Errorf("no device tokens provided")
	}

	// Filter out empty tokens
	validTokens := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if token != "" {
			validTokens = append(validTokens, token)
		}
	}

	if len(validTokens) == 0 {
		log.Printf("⚠️ No valid device tokens to send notification to")
		return nil
	}

	notification := GorushNotification{
		Tokens:   validTokens,
		Platform: platform,
		Title:    title,
		Message:  message,
		Sound:    "default",
		Badge:    1,
		Data:     data,
	}

	// iOS requires topic (bundle ID) for token-based authentication
	if platform == 1 {
		notification.Topic = bundleTopic
	}

	request := GorushRequest{
		Notifications: []GorushNotification{notification},
	}

	return p.sendRequest(p.baseURLFor(environment), request)
}

// SendToiOS sends a push notification to a single iOS device.
// environment is "dev" or "prod" and selects the APNs gateway.
func (p *GorushPusher) SendToiOS(token, environment string, title, message string, data map[string]string) error {
	return p.SendNotification([]string{token}, 1, environment, title, message, convertData(data))
}

// SendToAndroid sends a push notification to a single Android device.
// FCM has no sandbox/production split, so there is no environment argument.
func (p *GorushPusher) SendToAndroid(token string, title, message string, data map[string]string) error {
	return p.SendNotification([]string{token}, 2, "prod", title, message, convertData(data))
}

// SendToiOSMultiple sends a push notification to multiple iOS devices sharing
// one APNs environment. Callers holding a mixed set must group first.
func (p *GorushPusher) SendToiOSMultiple(tokens []string, environment string, title, message string, data map[string]interface{}) error {
	return p.SendNotification(tokens, 1, environment, title, message, data)
}

// SendToAndroidMultiple sends a push notification to multiple Android devices
func (p *GorushPusher) SendToAndroidMultiple(tokens []string, title, message string, data map[string]interface{}) error {
	return p.SendNotification(tokens, 2, "prod", title, message, data)
}

// convertData converts map[string]string to map[string]interface{}
func convertData(data map[string]string) map[string]interface{} {
	if data == nil {
		return nil
	}
	result := make(map[string]interface{}, len(data))
	for k, v := range data {
		result[k] = v
	}
	return result
}

// SendToMultiplePlatforms sends notifications to both iOS and Android
func (p *GorushPusher) SendToMultiplePlatforms(iosTokens, androidTokens []string, environment string, title, message string, data map[string]interface{}) error {
	var notifications []GorushNotification

	// Filter and add iOS notifications
	validIOSTokens := filterValidTokens(iosTokens)
	if len(validIOSTokens) > 0 {
		notifications = append(notifications, GorushNotification{
			Tokens:   validIOSTokens,
			Platform: 1,
			Title:    title,
			Message:  message,
			Topic:    bundleTopic, // iOS bundle ID required for APNs token auth
			Sound:    "default",
			Badge:    1,
			Data:     data,
		})
	}

	// Filter and add Android notifications
	validAndroidTokens := filterValidTokens(androidTokens)
	if len(validAndroidTokens) > 0 {
		notifications = append(notifications, GorushNotification{
			Tokens:   validAndroidTokens,
			Platform: 2,
			Title:    title,
			Message:  message,
			Sound:    "default",
			Data:     data,
		})
	}

	if len(notifications) == 0 {
		log.Printf("⚠️ No valid device tokens to send notification to")
		return nil
	}

	request := GorushRequest{
		Notifications: notifications,
	}

	return p.sendRequest(p.baseURLFor(environment), request)
}

func (p *GorushPusher) sendRequest(baseURL string, request GorushRequest) error {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal notification request: %w", err)
	}

	req, err := http.NewRequest("POST", baseURL+"/api/push", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send push notification: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var gorushResp GorushResponse
	if err := json.Unmarshal(body, &gorushResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("gorush returned status %d: %s", resp.StatusCode, string(body))
	}

	// Log any failures
	for _, logEntry := range gorushResp.Logs {
		if logEntry.Type == "failed-push" {
			log.Printf("❌ Push notification failed | platform: %s | error: %s", logEntry.Platform, logEntry.Error)
		}
	}

	log.Printf("✅ Push notification sent | count: %d | status: %s", gorushResp.Counts, gorushResp.Success)
	return nil
}

// HealthCheck verifies the gorush service is running
func (p *GorushPusher) HealthCheck() error {
	resp, err := p.httpClient.Get(p.prodURL + "/healthz")
	if err != nil {
		return fmt.Errorf("gorush health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("gorush health check returned status %d", resp.StatusCode)
	}

	return nil
}

func filterValidTokens(tokens []string) []string {
	valid := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if token != "" {
			valid = append(valid, token)
		}
	}
	return valid
}
