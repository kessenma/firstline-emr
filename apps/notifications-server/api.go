package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type APIClient struct {
	config     *Config
	httpClient *http.Client
}

func NewAPIClient(cfg *Config) *APIClient {
	return &APIClient{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SaveTelegramThread creates or updates a thread
func (c *APIClient) SaveTelegramThread(ctx context.Context, chatID, language string) error {
	reqBody := ThreadCreationRequest{
		TelegramChatID: chatID,
		Language:       language,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}

	url := fmt.Sprintf("%s/api/telegram-thread/new-thread", c.config.APIBaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("request creation error: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.MedFlowKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result ThreadCreationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode error: %w", err)
	}

	fmt.Printf("✅ Thread saved for chat %s", chatID)
	return nil
}

// SaveMessage saves a message to the backend
func (c *APIClient) SaveMessage(ctx context.Context, chatID string, msg *TelegramMessage) (*MessageSaveResponse, error) {
	jsonData, err := json.Marshal(msg)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	url := fmt.Sprintf("%s/api/telegram-thread/%s/save-message", c.config.APIBaseURL, chatID)
	log.Printf("➡️ Saving message | chat: %s | type: %s | mediaUrl: %s | endpoint: %s",
		chatID, msg.Type, msg.MediaURL, url)
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request creation error: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.MedFlowKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read error: %w", err)
	}

	log.Printf("⬅️ Save response | chat: %s | status: %d | bytes: %d | body: %s",
		chatID, resp.StatusCode, len(body), string(body))

	// Handle non-success status codes
	if resp.StatusCode != http.StatusOK {
		// Try to parse error response
		var errorResp struct {
			Error   string `json:"error"`
			Details string `json:"details"`
		}
		if err := json.Unmarshal(body, &errorResp); err == nil && errorResp.Error != "" {
			log.Printf("❌ Save failed | chat: %s | error: %s | details: %s",
				chatID, errorResp.Error, errorResp.Details)
			return nil, fmt.Errorf("save failed (%d): %s", resp.StatusCode, errorResp.Error)
		}
		log.Printf("❌ Save failed | chat: %s | status: %d | body: %s",
			chatID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("save failed with status %d: %s", resp.StatusCode, string(body))
	}

	var result MessageSaveResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode error: %w | body: %s", err, string(body))
	}

	if !result.Success {
		log.Printf("❌ Save failed | chat: %s | message: %s", chatID, result.Message)
		return nil, fmt.Errorf("save failed: %s", result.Message)
	}

	log.Printf("💾 Message saved for chat %s", chatID)
	return &result, nil
}

// LinkPatient attempts to link a patient to a Telegram chat using a link code
func (c *APIClient) LinkPatient(ctx context.Context, code, chatID string) (*LinkPatientResponse, error) {
	reqBody := LinkPatientRequest{
		Code:           code,
		TelegramChatID: chatID,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %w", err)
	}

	url := fmt.Sprintf("%s/api/telegram-thread/link-patient", c.config.APIBaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request creation error: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.MedFlowKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read error: %w", err)
	}

	// Rate limited — parse body for localized botMessage
	if resp.StatusCode == http.StatusTooManyRequests {
		var errResp LinkPatientResponse
		if err := json.Unmarshal(body, &errResp); err == nil && errResp.BotMessage != "" {
			return &LinkPatientResponse{Success: false, Error: "rate_limited", BotMessage: errResp.BotMessage}, nil
		}
		return &LinkPatientResponse{Success: false, Error: "rate_limited"}, nil
	}

	// Bad request (invalid format)
	if resp.StatusCode == http.StatusBadRequest {
		return &LinkPatientResponse{Success: false, Error: "invalid_code"}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result LinkPatientResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode error: %w", err)
	}

	return &result, nil
}

// GetIntakeURL retrieves the intake form token for a chat
func (c *APIClient) GetIntakeURL(ctx context.Context, chatID string) (string, error) {
	url := fmt.Sprintf("%s/api/telegram-thread/%s/get-intake-url", c.config.APIBaseURL, chatID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("request creation error: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.MedFlowKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result IntakeURLResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode error: %w", err)
	}

	return result.Token, nil
}
