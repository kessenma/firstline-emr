package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
)

// handleTextMessage processes incoming text messages
func handleTextMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
	chatID := fmt.Sprintf("%d", msg.Chat.ID)
	text := msg.Text

	// Prepare message for saving
	telegramMsg := &TelegramMessage{
		Text:      text,
		Sender:    "patient",
		Timestamp: time.Unix(int64(msg.Date), 0),
		Type:      "text",
		MediaURL:  "",
		ChatID:    chatID,
	}

	// Save message to backend
	_, err := apiClient.SaveMessage(ctx, chatID, telegramMsg)
	if err != nil {
		log.Printf("❌ Failed to save text message: %v", err)
		return
	}

	log.Printf("✅ Text message processed for chat %s", chatID)
}

// handlePhotoMessage processes incoming photo messages
func handlePhotoMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
	chatID := fmt.Sprintf("%d", msg.Chat.ID)
	caption := msg.Caption

	// Get the largest photo (last in array)
	if len(msg.Photo) == 0 {
		log.Printf("⚠️ No photos in message")
		return
	}
	photo := msg.Photo[len(msg.Photo)-1]

	// Get file info from Telegram
	file, err := b.GetFile(ctx, &bot.GetFileParams{
		FileID: photo.FileID,
	})
	if err != nil {
		log.Printf("❌ Failed to get file info: %v", err)
		return
	}

	// Download file from Telegram
	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s",
		config.TelegramToken, file.FilePath)

		log.Printf("⬇️ Downloading photo | url: %s", fileURL)
	imageData, err := downloadFile(ctx, fileURL)
	if err != nil {
		log.Printf("❌ Failed to download image: %v", err)
		return
	}

	// Upload to S3
	storageClient, err := NewStorageClient(config)
	if err != nil {
		log.Printf("❌ Failed to create storage client: %v", err)
		return
	}

	timestamp := time.Now()
	filePath := storageClient.buildFilePath("images", chatID, timestamp, ".jpg")
	log.Printf("🗂️ Image path resolved | %s", filePath)

	err = storageClient.UploadFile(ctx, filePath, imageData, "image/jpeg")
	if err != nil {
		log.Printf("❌ Failed to upload image: %v", err)
		return
	}

	// Generate and log a short-lived signed URL for verification
	if signed, err := storageClient.GenerateSignedURL(ctx, filePath, 5*time.Minute); err != nil {
		log.Printf("⚠️ Failed to generate signed URL for %s: %v", filePath, err)
	} else {
		log.Printf("🔗 Verification URL (5m): %s", signed)
	}

	// Save message with media URL
	text := caption
	if text == "" {
		text = "[Image]"
	}
	telegramMsg := &TelegramMessage{
		Text:      text,
		Sender:    "patient",
		Timestamp: timestamp,
		Type:      "image",
		MediaURL:  filePath,
		ChatID:    chatID,
	}

	_, err = apiClient.SaveMessage(ctx, chatID, telegramMsg)
	if err != nil {
		log.Printf("❌ Failed to save image message: %v", err)
		return
	}

	log.Printf("✅ Image message processed for chat %s", chatID)
}

// handleVideoMessage processes incoming video messages
func handleVideoMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
	chatID := fmt.Sprintf("%d", msg.Chat.ID)
	caption := msg.Caption

	if msg.Video == nil {
		log.Printf("⚠️ No video in message")
		return
	}

	// Get file info from Telegram
	file, err := b.GetFile(ctx, &bot.GetFileParams{
		FileID: msg.Video.FileID,
	})
	if err != nil {
		log.Printf("❌ Failed to get file info: %v", err)
		return
	}

	// Download file from Telegram
	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s",
		config.TelegramToken, file.FilePath)

	log.Printf("⬇️ Downloading video | url: %s", fileURL)
	videoData, err := downloadFile(ctx, fileURL)
	if err != nil {
		log.Printf("❌ Failed to download video: %v", err)
		return
	}

	// Upload to S3
	storageClient, err := NewStorageClient(config)
	if err != nil {
		log.Printf("❌ Failed to create storage client: %v", err)
		return
	}

	timestamp := time.Now()
	filePath := storageClient.buildFilePath("videos", chatID, timestamp, ".mp4")
	log.Printf("🗂️ Video path resolved | %s", filePath)

	err = storageClient.UploadFile(ctx, filePath, videoData, "video/mp4")
	if err != nil {
		log.Printf("❌ Failed to upload video: %v", err)
		return
	}

	if signed, err := storageClient.GenerateSignedURL(ctx, filePath, 5*time.Minute); err != nil {
		log.Printf("⚠️ Failed to generate signed URL for %s: %v", filePath, err)
	} else {
		log.Printf("🔗 Verification URL (5m): %s", signed)
	}

	// Save message
	text := caption
	if text == "" {
		text = "[Video]"
	}
	telegramMsg := &TelegramMessage{
		Text:      text,
		Sender:    "patient",
		Timestamp: timestamp,
		Type:      "video",
		MediaURL:  filePath,
		ChatID:    chatID,
	}

	_, err = apiClient.SaveMessage(ctx, chatID, telegramMsg)
	if err != nil {
		log.Printf("❌ Failed to save video message: %v", err)
		return
	}

	log.Printf("✅ Video message processed for chat %s", chatID)
}

// handleAudioMessage processes audio and voice messages
func handleAudioMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
	chatID := fmt.Sprintf("%d", msg.Chat.ID)

	var fileID string
	if msg.Audio != nil {
		fileID = msg.Audio.FileID
	} else if msg.Voice != nil {
		fileID = msg.Voice.FileID
	} else {
		log.Printf("⚠️ No audio/voice in message")
		return
	}

	// Get file info
	file, err := b.GetFile(ctx, &bot.GetFileParams{
		FileID: fileID,
	})
	if err != nil {
		log.Printf("❌ Failed to get file info: %v", err)
		return
	}

	// Download file
	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s",
		config.TelegramToken, file.FilePath)

	log.Printf("⬇️ Downloading audio/voice | url: %s", fileURL)
	audioData, err := downloadFile(ctx, fileURL)
	if err != nil {
		log.Printf("❌ Failed to download audio: %v", err)
		return
	}

	// Upload to S3
	storageClient, err := NewStorageClient(config)
	if err != nil {
		log.Printf("❌ Failed to create storage client: %v", err)
		return
	}

	timestamp := time.Now()

	// Determine content type and extension based on audio source
	contentType := "audio/ogg"
	ext := ".ogg"
	if msg.Audio != nil && msg.Audio.MimeType != "" {
		contentType = msg.Audio.MimeType
		switch contentType {
		case "audio/mp3", "audio/mpeg":
			ext = ".mp3"
		case "audio/mp4":
			ext = ".mp4"
		case "audio/wav":
			ext = ".wav"
		default:
			ext = ".ogg"
		}
	}

	filePath := storageClient.buildFilePath("audio", chatID, timestamp, ext)
	log.Printf("🗂️ Audio path resolved | %s (content-type: %s)", filePath, contentType)

	err = storageClient.UploadFile(ctx, filePath, audioData, contentType)
	if err != nil {
		log.Printf("❌ Failed to upload audio: %v", err)
		return
	}

	if signed, err := storageClient.GenerateSignedURL(ctx, filePath, 5*time.Minute); err != nil {
		log.Printf("⚠️ Failed to generate signed URL for %s: %v", filePath, err)
	} else {
		log.Printf("🔗 Verification URL (5m): %s", signed)
	}

	// Save message
	telegramMsg := &TelegramMessage{
		Text:      "[Audio]",
		Sender:    "patient",
		Timestamp: timestamp,
		Type:      "audio",
		MediaURL:  filePath,
		ChatID:    chatID,
	}

	_, err = apiClient.SaveMessage(ctx, chatID, telegramMsg)
	if err != nil {
		log.Printf("❌ Failed to save audio message: %v", err)
		return
	}

	log.Printf("✅ Audio message processed for chat %s", chatID)
}

// handleURLCommand handles the /url command
func handleURLCommand(ctx context.Context, b *bot.Bot, msg *models.Message) {
	chatID := fmt.Sprintf("%d", msg.Chat.ID)

	// Get token from backend
	token, err := apiClient.GetIntakeURL(ctx, chatID)
	if err != nil {
		log.Printf("❌ Failed to get intake URL: %v", err)

		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: msg.Chat.ID,
			Text:   "Sorry, we couldn't generate your registration link. Please try again later.",
		})
		return
	}

	// Construct full URL using public URL for user-facing links
	registrationURL := fmt.Sprintf("%s/telegram-patient/%s", config.PublicURL, token)

	// Send to user
	_, err = b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: msg.Chat.ID,
		Text:   registrationURL,
	})

	if err != nil {
		log.Printf("❌ Failed to send URL message: %v", err)
		return
	}

	log.Printf("✅ Sent intake URL to chat %s", chatID)
}

// downloadFile downloads a file from a URL
func downloadFile(ctx context.Context, url string) (io.Reader, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	start := time.Now()
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ HTTP download error | url: %s | err: %v", url, err)
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	// Read the entire response into memory
	data, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}

	log.Printf("⬇️ Download complete | url: %s | bytes: %d | duration: %s", url, len(data), time.Since(start))
	return bytes.NewReader(data), nil
}
