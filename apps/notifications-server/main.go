package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
	_ "github.com/lib/pq"
)

var (
	config     *Config
	apiClient  *APIClient
	httpClient = &http.Client{Timeout: 30 * time.Second}
	db         *sql.DB
	pusher     *GorushPusher
	voipPusher *VoipPusher
)

func main() {
	// Configure logging
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.SetPrefix("[TELEGRAM-BOT-GO] ")

	// Load configuration
	var err error
	config, err = LoadConfig()
	if err != nil {
		log.Fatalf("❌ Configuration error: %v", err)
	}

	// Initialize API client
	apiClient = NewAPIClient(config)

	// Initialize database connection
	if config.DatabaseURL != "" {
		db, err = sql.Open("postgres", config.DatabaseURL)
		if err != nil {
			log.Fatalf("❌ Failed to connect to database: %v", err)
		}
		defer db.Close()

		// Test database connection
		if err := db.Ping(); err != nil {
			log.Fatalf("❌ Failed to ping database: %v", err)
		}
		log.Println("✅ Database connected")
	} else {
		log.Println("⚠️ No DATABASE_URL provided, push notifications will not work")
	}

	// Initialize Gorush pusher
	if config.GorushURL != "" {
		pusher = NewGorushPusher(config.GorushURL, config.GorushSandboxURL)
		log.Printf("✅ Gorush pusher initialized: prod=%s", config.GorushURL)
		if config.GorushSandboxURL != "" {
			log.Printf("✅ Gorush sandbox instance: %s", config.GorushSandboxURL)
		} else {
			// Worth shouting about: without it, Debug builds — the only way to
			// exercise CallKit on a real device — cannot receive any push.
			log.Println("⚠️ No GORUSH_SANDBOX_URL — dev-registered (Debug build) tokens will be sent to production APNs and fail with BadDeviceToken")
		}
	} else {
		log.Println("⚠️ No GORUSH_URL provided, push notifications will not work")
	}

	// PushKit client for staff-call ringing. Independent of Gorush — see voip.go.
	voipPusher = NewVoipPusher()
	if voipPusher != nil {
		log.Println("✅ VoIP (PushKit) pusher initialized")
	}

	log.Printf("🚀 Initializing Telegram bot")
	log.Printf("🔗 Backend API: %s", config.APIBaseURL)
	log.Printf("🌍 Environment: %s", config.Environment)

	// Create context with interrupt signal
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	// Configure bot with default handler
	opts := []bot.Option{
		bot.WithDefaultHandler(messageHandler),
	}

	// Create bot instance
	b, err := bot.New(config.TelegramToken, opts...)
	if err != nil {
		log.Fatalf("❌ Failed to create bot: %v", err)
	}

	// Register /url command handler
	b.RegisterHandler(bot.HandlerTypeMessageText, "/url", bot.MatchTypeExact,
		func(ctx context.Context, b *bot.Bot, update *models.Update) {
			if update.Message != nil {
				handleURLCommand(ctx, b, update.Message)
			}
		},
	)

	log.Println("✅ Telegram bot started successfully")

	// Start health check server in background
	go startHealthServer()

	// Start bot (blocking)
	b.Start(ctx)

	log.Println("🛑 Telegram bot shutting down gracefully")
}

// linkCodeRegex matches 6-char codes from any supported alphabet:
// - Latin: A-Z (minus O/I), digits 2-9
// - Arabic: ب ت ج د ر س ع ف ك ل م ن ه + Arabic-Indic digits ٢-٩
var linkCodeRegex = regexp.MustCompile(`^[A-Z2-9بتجدرسعفكلمنه٢٣٤٥٦٧٨٩]{6}$`)

// messageHandler handles all incoming messages
func messageHandler(ctx context.Context, b *bot.Bot, update *models.Update) {
	// Ignore non-message updates
	if update.Message == nil {
		return
	}

	msg := update.Message
	chatID := fmt.Sprintf("%d", msg.Chat.ID)

	// Log incoming message
	logIncomingMessage(msg)

	// Check for link code BEFORE creating a thread (to avoid creating a duplicate patient)
	if msg.Text != "" {
		code := extractLinkCode(msg.Text)
		if code != "" {
			if handleLinkCode(ctx, b, msg, chatID, code) {
				return // Link code handled — don't create new thread/patient
			}
			// Link code failed — fall through to normal flow
		}
	}

	// Create/update thread for every message
	if err := saveTelegramThread(ctx, chatID, "en"); err != nil {
		log.Printf("⚠️ Failed to save thread for chat %s: %v", chatID, err)
	}

	// Route message based on type
	if msg.Text != "" {
		handleTextMessage(ctx, b, msg)
	} else if msg.Photo != nil {
		handlePhotoMessage(ctx, b, msg)
	} else if msg.Video != nil {
		handleVideoMessage(ctx, b, msg)
	} else if msg.Audio != nil || msg.Voice != nil {
		handleAudioMessage(ctx, b, msg)
	}
}

// extractLinkCode extracts a link code from message text
// Supports: plain 6-char code, /start CODE deep link
func extractLinkCode(text string) string {
	trimmed := strings.TrimSpace(text)

	// Handle /start CODE deep link (from QR code / t.me link)
	if strings.HasPrefix(trimmed, "/start ") {
		parts := strings.Fields(trimmed)
		if len(parts) == 2 {
			candidate := strings.ToUpper(parts[1])
			if linkCodeRegex.MatchString(candidate) {
				return candidate
			}
		}
		return ""
	}

	// Handle plain code typed by user
	candidate := strings.ToUpper(trimmed)
	if linkCodeRegex.MatchString(candidate) {
		return candidate
	}

	return ""
}

// handleLinkCode attempts to link a patient via code
// Returns true if the code was handled (success or pending), false to fall through
func handleLinkCode(ctx context.Context, b *bot.Bot, msg *models.Message, chatID, code string) bool {
	log.Printf("🔗 Link code detected | chat: %s | code: %s", chatID, code)

	result, err := apiClient.LinkPatient(ctx, code, chatID)
	if err != nil {
		log.Printf("❌ Link patient API error: %v", err)
		return false // Fall through to normal flow
	}

	if result.Success {
		// Use localized message from API, fallback to English
		welcomeMsg := result.BotMessage
		if welcomeMsg == "" {
			welcomeMsg = fmt.Sprintf(
				"Your Telegram is now linked to your medical record. Welcome, %s!",
				result.PatientName,
			)
		}
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: msg.Chat.ID,
			Text:   welcomeMsg,
		})
		log.Printf("✅ Patient linked | chat: %s | patient: %s (%s)",
			chatID, result.PatientName, result.PatientID)
		return true
	}

	if result.Pending {
		// Use localized message from API, fallback to English
		pendingMsg := result.BotMessage
		if pendingMsg == "" {
			pendingMsg = "Code not yet registered. Please try again shortly."
		}
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: msg.Chat.ID,
			Text:   pendingMsg,
		})
		log.Printf("⏳ Link code pending | chat: %s | code: %s", chatID, code)
		return true
	}

	if result.Error == "rate_limited" {
		rateLimitMsg := result.BotMessage
		if rateLimitMsg == "" {
			rateLimitMsg = "Too many attempts. Please try again later."
		}
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: msg.Chat.ID,
			Text:   rateLimitMsg,
		})
		return true
	}

	// Invalid/expired code — fall through to normal flow
	log.Printf("⚠️ Invalid link code | chat: %s | code: %s | error: %s",
		chatID, code, result.Error)
	return false
}

func logIncomingMessage(msg *models.Message) {
	userInfo := "Unknown"
	if msg.From != nil {
		userInfo = fmt.Sprintf("%s (@%s, ID: %d)",
			msg.From.FirstName,
			msg.From.Username,
			msg.From.ID)
	}

	kind := "unknown"
	extra := ""
	if msg.Text != "" {
		if strings.HasPrefix(msg.Text, "/") {
			fields := strings.Fields(msg.Text)
			cmd := ""
			args := ""
			if len(fields) > 0 {
				cmd = fields[0]
				if len(fields) > 1 {
					args = strings.Join(fields[1:], " ")
				}
			}
			kind = "command"
			if args != "" {
				extra = fmt.Sprintf(" | Command: %s | Args: '%s'", cmd, args)
			} else {
				extra = fmt.Sprintf(" | Command: %s", cmd)
			}
		} else {
			kind = "text"
			extra = fmt.Sprintf(" | Text: '%s'", msg.Text)
		}
	} else if msg.Photo != nil && len(msg.Photo) > 0 {
		kind = "photo"
		if msg.Caption != "" {
			extra = fmt.Sprintf(" | Caption: '%s'", msg.Caption)
		}
	} else if msg.Video != nil {
		kind = "video"
		if msg.Caption != "" {
			extra = fmt.Sprintf(" | Caption: '%s'", msg.Caption)
		}
	} else if msg.Audio != nil {
		kind = "audio"
	} else if msg.Voice != nil {
		kind = "voice"
	}

	log.Printf("📨 Type: %s | From %s | Chat: %d%s",
		kind, userInfo, msg.Chat.ID, extra)
}

// saveTelegramThread is a helper to create/update threads
func saveTelegramThread(ctx context.Context, chatID, language string) error {
	return apiClient.SaveTelegramThread(ctx, chatID, language)
}

// Global variable to track server start time
var serverStartTime = time.Now()

// HealthResponse represents the health check response
type HealthResponse struct {
	Status            string  `json:"status"`
	Service           string  `json:"service"`
	Uptime            float64 `json:"uptime"`
	Timestamp         string  `json:"timestamp"`
	DatabaseConnected bool    `json:"database_connected"`
	GorushConnected   bool    `json:"gorush_connected"`
}

// startHealthServer starts a simple HTTP server for health checks
func startHealthServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Calculate uptime in seconds
		uptime := time.Since(serverStartTime).Seconds()

		// Check database connection
		dbConnected := false
		if db != nil {
			if err := db.Ping(); err == nil {
				dbConnected = true
			}
		}

		// Check gorush connection
		gorushConnected := pusher != nil

		// Determine overall status
		status := "healthy"
		if !dbConnected || !gorushConnected {
			status = "unhealthy"
		}

		response := HealthResponse{
			Status:            status,
			Service:           "notifications-server",
			Uptime:            uptime,
			Timestamp:         time.Now().Format(time.RFC3339),
			DatabaseConnected: dbConnected,
			GorushConnected:   gorushConnected,
		}

		w.Header().Set("Content-Type", "application/json")
		if status == "unhealthy" {
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}
		json.NewEncoder(w).Encode(response)
	})

	// Push notification endpoint
	mux.HandleFunc("/api/push/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if db == nil || pusher == nil {
			http.Error(w, "Push notifications not configured", http.StatusServiceUnavailable)
			return
		}

		var notification PushNotification
		if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		ctx := r.Context()
		if err := SendPushNotification(ctx, db, pusher, &notification); err != nil {
			log.Printf("❌ Failed to send push notification: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Push notification sent",
		})
	})

	// VoIP push endpoint — rings an incoming staff call via PushKit.
	// Called by apps/web/lib/voipPush.ts; see voip.go for why this bypasses Gorush.
	mux.HandleFunc("/api/push/voip", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Unlike the older /api/push/* handlers this one is authenticated: it
		// can ring any user's phone, so an unauthenticated caller could use it
		// to harass staff.
		if config.MedFlowKey != "" {
			if r.Header.Get("Authorization") != "Bearer "+config.MedFlowKey {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}

		if db == nil || voipPusher == nil {
			http.Error(w, "VoIP push not configured", http.StatusServiceUnavailable)
			return
		}

		var body struct {
			UserID string `json:"user_id"`
			// map[string]string, not interface{}: the payload crosses into a
			// native handler that reads every value as a string.
			Payload map[string]string `json:"payload"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if body.UserID == "" {
			http.Error(w, "user_id is required", http.StatusBadRequest)
			return
		}

		result, err := voipPusher.SendCallPush(r.Context(), db, body.UserID, body.Payload)
		if err != nil {
			log.Printf("❌ VoIP push failed for user %s: %v", body.UserID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})

	// Batch push notifications endpoint
	mux.HandleFunc("/api/push/send-batch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if db == nil || pusher == nil {
			http.Error(w, "Push notifications not configured", http.StatusServiceUnavailable)
			return
		}

		var notifications []*PushNotification
		if err := json.NewDecoder(r.Body).Decode(&notifications); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		ctx := r.Context()
		if err := SendPushNotifications(ctx, db, pusher, notifications); err != nil {
			log.Printf("❌ Failed to send batch push notifications: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Sent %d notifications", len(notifications)),
		})
	})

	// Statistics endpoint (placeholder for now - can be enhanced with actual tracking)
	mux.HandleFunc("/api/push/stats", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// TODO: Implement actual statistics tracking in database
		// For now, return placeholder data
		stats := map[string]interface{}{
			"total_sent":   0,
			"ios_sent":     0,
			"android_sent": 0,
			"failed":       0,
			"last_24h":     0,
			"last_hour":    0,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	})

	addr := ":" + config.Port
	log.Printf("🏥 Health server starting on port %s", config.Port)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Printf("❌ Health server error: %v", err)
	}
}
