package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-telegram/bot"
)

// FollowUpCron handles scheduled follow-up messages
type FollowUpCron struct {
	bot       *bot.Bot
	apiClient *APIClient
	config    *Config
}

func NewFollowUpCron(b *bot.Bot, api *APIClient, cfg *Config) *FollowUpCron {
	return &FollowUpCron{
		bot:       b,
		apiClient: api,
		config:    cfg,
	}
}

// Run executes the follow-up job
func (fc *FollowUpCron) Run(ctx context.Context) error {
	log.Println("🔄 Starting follow-up CRON job")

	// Fetch threads needing follow-up
	threads, err := fc.fetchFollowUpThreads(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch threads: %w", err)
	}

	if len(threads) == 0 {
		log.Println("✅ No follow-ups needed")
		return nil
	}

	log.Printf("📋 Processing %d follow-ups", len(threads))

	for _, thread := range threads {
		if err := fc.sendFollowUp(ctx, thread); err != nil {
			log.Printf("❌ Failed to send follow-up to %s: %v", thread.ChatID, err)
			continue
		}
	}

	log.Println("✅ Follow-up CRON job completed")
	return nil
}

// fetchFollowUpThreads retrieves threads needing follow-up
func (fc *FollowUpCron) fetchFollowUpThreads(ctx context.Context) ([]FollowUpThread, error) {
	url := fmt.Sprintf("%s/api/telegram-thread/CRON/v1-chat-follow-up", fc.config.APIBaseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", fc.config.MedFlowKey))

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result FollowUpResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.FollowUps, nil
}

// sendFollowUp sends a follow-up message to a thread
func (fc *FollowUpCron) sendFollowUp(ctx context.Context, thread FollowUpThread) error {
	// Check if follow-up already sent
	if fc.hasFollowUp(thread) {
		log.Printf("ℹ️ Chat %s already has follow-up, skipping", thread.ChatID)
		return nil
	}

	// Follow-up message template
	followUpText := `Hi! This is a friendly reminder from the MedFlow team.

We noticed you started a conversation with us, and we'd love to help you complete your registration.

If you have any questions or need assistance, please don't hesitate to reach out!`

	// Send message on Telegram
	chatID, err := strconv.ParseInt(thread.ChatID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid chat ID: %w", err)
	}

	_, err = fc.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: chatID,
		Text:   followUpText,
	})
	if err != nil {
		return fmt.Errorf("failed to send telegram message: %w", err)
	}

	log.Printf("📤 Follow-up sent to chat %s", thread.ChatID)

	// Save message to backend
	telegramMsg := &TelegramMessage{
		Text:      followUpText,
		Sender:    "bot", // Will be transformed to "MedFlow Team" by backend
		Timestamp: time.Now(),
		Type:      "text",
		MediaURL:  "",
		ChatID:    thread.ChatID,
	}

	_, err = fc.apiClient.SaveMessage(ctx, thread.ChatID, telegramMsg)
	if err != nil {
		return fmt.Errorf("failed to save message: %w", err)
	}

	// Save follow-up record
	if err := fc.saveFollowUpRecord(ctx, thread.ChatID, thread.ID, followUpText); err != nil {
		return fmt.Errorf("failed to save follow-up record: %w", err)
	}

	return nil
}

// hasFollowUp checks if thread already received a follow-up
func (fc *FollowUpCron) hasFollowUp(thread FollowUpThread) bool {
	for _, msg := range thread.Messages {
		if msg.Sender == "MedFlow Team" &&
		   (msg.Text == "" || len(msg.Text) > 10 && msg.Text[:20] == "Hi! This is a friend") {
			return true
		}
	}
	return false
}

// saveFollowUpRecord saves the follow-up to PatientFollowUp model
func (fc *FollowUpCron) saveFollowUpRecord(ctx context.Context, chatID, threadID, message string) error {
	payload := map[string]interface{}{
		"chatId":           chatID,
		"telegramThreadId": threadID,
		"message":          message,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/telegram-thread/save-follow-up", fc.config.APIBaseURL)
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", fc.config.MedFlowKey))

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("💾 Follow-up record saved for chat %s", chatID)
	return nil
}
