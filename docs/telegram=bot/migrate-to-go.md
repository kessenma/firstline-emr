# Telegram Bot Migration Strategy: Node.js to Go

**Version:** 1.0  
**Target Audience:** LLMs and Software Engineers  
**Project:** MedFlow EMR Telegram Bot  
**Migration Type:** Node.js → Go

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Reference Architecture](#reference-architecture)
3. [Pre-Migration Analysis](#pre-migration-analysis)
4. [Migration Phases](#migration-phases)
5. [Detailed Step-by-Step Guide](#detailed-step-by-step-guide)
6. [Verification Checklist](#verification-checklist)
7. [Rollback Plan](#rollback-plan)

---

## Overview

### Purpose
Convert the existing Node.js Telegram bot (`apps/telegram-bot`) to Go, using the reference Go implementation (`apps/0-examples/go-convex-telegram-turborepo/apps/golang-telegram-bot`) as the architectural model.

### Key Differences

| Aspect | Node.js (Current) | Go (Target) |
|--------|------------------|-------------|
| **Bot Library** | `node-telegram-bot-api` | `github.com/go-telegram/bot` |
| **HTTP Client** | `axios`, `node-fetch` | `net/http` |
| **File Storage** | `@aws-sdk/client-s3` | Native Go AWS SDK v2 |
| **Concurrency** | Event loop, async/await | Goroutines, channels |
| **Config** | `dotenv` | `os.Getenv()` |
| **Architecture** | Callback-based handlers | Context-based handlers |

### Migration Goals
- ✅ Maintain all existing functionality
- ✅ Improve performance and resource usage
- ✅ Better concurrency handling
- ✅ Type safety and compile-time error checking
- ✅ Simplified deployment (single binary)

---

## Reference Architecture

### Node.js Bot Structure (Current)
```
apps/telegram-bot/
├── bot.js                      # Main entry point, message handling
├── saveTelegramThread.js       # Thread creation/management
├── followUpCron.js            # Scheduled follow-up messages
├── send-url.js                # /url command handler
├── save-messages/
│   ├── saveAudio.js           # Audio file handling
│   ├── saveImages.js          # Image file handling
│   ├── saveVideo.js           # Video file handling
│   └── saveText.js            # Text message handling
├── utils/
│   └── encryption.js          # Utility functions
└── CRON-messages/
    └── v1-follow-up.js        # Message templates
```

### Go Bot Structure (Target - Based on Reference)
```
apps/telegram-bot-go/
├── main.go                    # Entry point, bot initialization
├── handlers.go                # Message and command handlers
├── api.go                     # API client for MedFlow backend
├── storage.go                 # S3/MinIO file operations
├── websocket.go               # WebSocket notifications
├── cron.go                    # Scheduled jobs (follow-ups)
├── config.go                  # Configuration management
├── types.go                   # Shared type definitions
├── queue.go                   # Optional: Job queue system
├── go.mod                     # Dependencies
├── go.sum                     # Dependency checksums
├── Makefile                   # Build and deployment commands
└── README.md                  # Documentation
```

---

## Pre-Migration Analysis

### Phase 0: Inventory & Analysis

#### ✅ STEP 0.1: Catalog Existing Features

**Action:** Create complete feature inventory

**Current Bot Features:**
- [ ] Message handling (text, image, video, audio, voice)
- [ ] Media file download from Telegram
- [ ] Media upload to S3/MinIO (DigitalOcean Spaces)
- [ ] Thread creation and management
- [ ] Message persistence to API
- [ ] WebSocket real-time notifications
- [ ] `/url` command (intake form link generation)
- [ ] Follow-up message CRON job
- [ ] Caption support for media messages
- [ ] Sender field management (patient/bot/MedFlow Team)
- [ ] Environment-based folder structure (dev/staging/prod)
- [ ] Signed URL generation for private media
- [ ] Authorization via MEDFLOW_KEY

**Deliverable:** Completed checklist of all features to migrate

---

#### ✅ STEP 0.2: Map Dependencies

**Action:** Identify Node.js dependencies and their Go equivalents

| Node.js Package | Purpose | Go Equivalent | Notes |
|----------------|---------|---------------|-------|
| `node-telegram-bot-api` | Telegram Bot API | `github.com/go-telegram/bot` | Reference implementation uses this |
| `@aws-sdk/client-s3` | S3 storage | `github.com/aws/aws-sdk-go-v2` | Official AWS SDK |
| `axios`, `node-fetch` | HTTP requests | `net/http` | Built-in, standard library |
| `dotenv` | Environment variables | `os.Getenv()` | Built-in, or use `github.com/joho/godotenv` |
| `crypto` | Encryption utilities | `crypto/*` packages | Built-in standard library |
| `ffmpeg` (if used) | Media processing | `github.com/u2takey/ffmpeg-go` | Optional, check if needed |

**Deliverable:** Complete dependency mapping table

---

#### ✅ STEP 0.3: Analyze API Contracts

**Action:** Document all external API calls and their contracts

**External Integrations:**
1. **MedFlow Backend API:**
   - `POST /api/telegram-thread/new-thread` - Create thread
   - `PATCH /api/telegram-thread/{chatId}/save-message` - Save message
   - `GET /api/telegram-thread/{chatId}/get-intake-url` - Get form URL
   - `GET /api/telegram-thread/CRON/v1-chat-follow-up` - Get follow-ups
   - `PATCH /api/telegram-thread/save-follow-up` - Save follow-up record

2. **WebSocket Server:**
   - `POST /api/send-message` - Real-time message delivery

3. **Telegram Bot API:**
   - `getFile()` - Get file metadata
   - `sendMessage()` - Send text messages
   - Download file from: `https://api.telegram.org/file/bot{token}/{file_path}`

4. **S3/MinIO Storage:**
   - `PutObject` - Upload files
   - `GetObject` (via signed URL) - Retrieve files

**Deliverable:** API contract documentation with request/response examples

---

#### ✅ STEP 0.4: Identify Environment Variables

**Action:** List all required environment variables

**Required Environment Variables:**
```
TELEGRAM_BOT_TOKEN           # Telegram bot authentication token
MEDFLOW_KEY                  # Backend API authorization
API_BASE_URL                 # Backend API endpoint
WEBSOCKET_SERVER_URL         # WebSocket service endpoint
OBJECT_STORAGE_ENDPOINT      # S3/MinIO endpoint
OBJECT_STORAGE_CDN_ENDPOINT  # CDN endpoint (if different)
OBJECT_STORAGE_REGION        # Storage region
OBJECT_STORAGE_BUCKET        # Bucket name
OBJECT_STORAGE_KEY           # Access key ID
OBJECT_STORAGE_SECRET        # Secret access key
NODE_ENV                     # Environment (development/staging/prod)
```

**Deliverable:** Environment variable documentation with validation rules

---

## Migration Phases

### Phase Breakdown

```
Phase 1: Project Setup & Configuration (Foundation)
  ↓
Phase 2: Core Bot Implementation (Message Handling)
  ↓
Phase 3: Media Handling & Storage (File Operations)
  ↓
Phase 4: Command Handlers (/url, etc.)
  ↓
Phase 5: CRON Job Migration (Follow-ups)
  ↓
Phase 6: Testing & Validation
  ↓
Phase 7: Deployment & Cutover
```

---

## Detailed Step-by-Step Guide

---

### 🔷 PHASE 1: Project Setup & Configuration

**Objective:** Create Go project structure with proper configuration

---

#### ✅ STEP 1.1: Initialize Go Module

**Action:** Create new Go project with dependencies

```bash
# Navigate to project root
cd /Users/ke/ws/fajr-medflow-emr/apps

# Create new directory
mkdir telegram-bot-go
cd telegram-bot-go

# Initialize Go module
go mod init telegram-bot-go

# Add primary dependencies
go get github.com/go-telegram/bot@v1.8.2
go get github.com/aws/aws-sdk-go-v2
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/service/s3
go get github.com/aws/aws-sdk-go-v2/credentials
go get github.com/joho/godotenv  # Optional, for local .env loading
```

**Validation:**
- `go.mod` exists with correct module name
- All dependencies download successfully
- Run `go mod tidy` to clean up

**Reference:** Check `apps/0-examples/go-convex-telegram-turborepo/apps/golang-telegram-bot/go.mod`

---

#### ✅ STEP 1.2: Create Project Files

**Action:** Set up initial file structure

**Create these files:**

1. **main.go** - Entry point (start here)
2. **config.go** - Configuration management
3. **types.go** - Shared type definitions
4. **Makefile** - Build commands
5. **.gitignore** - Ignore build artifacts

**File: config.go**
```go
package main

import (
    "fmt"
    "log"
    "os"
)

type Config struct {
    TelegramToken        string
    MedFlowKey          string
    APIBaseURL          string
    WebSocketServerURL  string
    StorageEndpoint     string
    StorageRegion       string
    StorageBucket       string
    StorageKey          string
    StorageSecret       string
    Environment         string
}

func LoadConfig() (*Config, error) {
    cfg := &Config{
        TelegramToken:      os.Getenv("TELEGRAM_BOT_TOKEN"),
        MedFlowKey:        os.Getenv("MEDFLOW_KEY"),
        APIBaseURL:        os.Getenv("API_BASE_URL"),
        WebSocketServerURL: os.Getenv("WEBSOCKET_SERVER_URL"),
        StorageEndpoint:   os.Getenv("OBJECT_STORAGE_ENDPOINT"),
        StorageRegion:     os.Getenv("OBJECT_STORAGE_REGION"),
        StorageBucket:     os.Getenv("OBJECT_STORAGE_BUCKET"),
        StorageKey:        os.Getenv("OBJECT_STORAGE_KEY"),
        StorageSecret:     os.Getenv("OBJECT_STORAGE_SECRET"),
        Environment:       os.Getenv("NODE_ENV"),
    }

    // Set defaults
    if cfg.Environment == "" {
        cfg.Environment = "development"
    }
    if cfg.StorageRegion == "" {
        cfg.StorageRegion = "us-east-1"
    }
    if cfg.WebSocketServerURL == "" {
        cfg.WebSocketServerURL = "http://websocket-server:3001"
    }

    // Validate required fields
    if cfg.TelegramToken == "" {
        return nil, fmt.Errorf("TELEGRAM_BOT_TOKEN is required")
    }
    if cfg.MedFlowKey == "" {
        return nil, fmt.Errorf("MEDFLOW_KEY is required")
    }
    if cfg.APIBaseURL == "" {
        return nil, fmt.Errorf("API_BASE_URL is required")
    }

    return cfg, nil
}
```

**Validation:**
- All files compile without errors
- `go build` succeeds

---

#### ✅ STEP 1.3: Define Core Types

**Action:** Create type definitions for messages and API responses

**File: types.go**
```go
package main

import "time"

// TelegramMessage represents a message to save to the backend
type TelegramMessage struct {
    Text      string    `json:"text"`
    Sender    string    `json:"sender"`
    Timestamp time.Time `json:"timestamp"`
    Type      string    `json:"type"`      // "text", "image", "video", "audio"
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
    Success bool   `json:"success"`
    ThreadID string `json:"threadId,omitempty"`
    Message  string `json:"message,omitempty"`
}

// MessageSaveResponse from the backend
type MessageSaveResponse struct {
    Success      bool            `json:"success"`
    SavedMessage *SavedMessage   `json:"savedMessage,omitempty"`
    Message      string          `json:"message,omitempty"`
}

// SavedMessage represents a message saved in the database
type SavedMessage struct {
    ID              string    `json:"_id"`
    TelegramChatID  string    `json:"telegramChatId"`
    Text            string    `json:"text"`
    Sender          string    `json:"sender"`
    Timestamp       time.Time `json:"timestamp"`
    Type            string    `json:"type"`
    MediaURL        string    `json:"mediaUrl"`
}

// WebSocketMessage for real-time notifications
type WebSocketMessage struct {
    TelegramChatID string       `json:"telegramChatId"`
    Message        *SavedMessage `json:"message"`
}

// IntakeURLResponse for /url command
type IntakeURLResponse struct {
    Token string `json:"token"`
}

// FollowUpThread represents a thread needing follow-up
type FollowUpThread struct {
    ID       string             `json:"_id"`
    ChatID   string             `json:"chatId"`
    Messages []TelegramMessage  `json:"messages,omitempty"`
}

// FollowUpResponse from CRON endpoint
type FollowUpResponse struct {
    FollowUps []FollowUpThread `json:"followUps"`
}
```

**Validation:**
- All types compile successfully
- JSON tags match API contracts

---

### 🔷 PHASE 2: Core Bot Implementation

**Objective:** Implement basic message receiving and text handling

---

#### ✅ STEP 2.1: Create Main Bot Entry Point

**Action:** Implement basic bot initialization and message handler

**File: main.go**
```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"

    "github.com/go-telegram/bot"
    "github.com/go-telegram/bot/models"
)

var (
    config     *Config
    apiClient  *APIClient
    httpClient = &http.Client{Timeout: 30 * time.Second}
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

    log.Println("✅ Telegram bot started successfully")
    
    // Start bot (blocking)
    b.Start(ctx)
    
    log.Println("🛑 Telegram bot shutting down gracefully")
}

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

func logIncomingMessage(msg *models.Message) {
    userInfo := "Unknown"
    if msg.From != nil {
        userInfo = fmt.Sprintf("%s (@%s, ID: %d)",
            msg.From.FirstName,
            msg.From.Username,
            msg.From.ID)
    }
    
    log.Printf("📨 Message from %s | Chat: %d | Text: '%s'",
        userInfo, msg.Chat.ID, msg.Text)
}
```

**Validation:**
- Bot starts without errors
- Can receive messages
- Logging works correctly
- Graceful shutdown on Ctrl+C

**Reference:** `apps/0-examples/.../main.go` lines 1-100

---

#### ✅ STEP 2.2: Implement API Client

**Action:** Create reusable API client for backend communication

**File: api.go**
```go
package main

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
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

    log.Printf("✅ Thread saved for chat %s", chatID)
    return nil
}

// SaveMessage saves a message to the backend
func (c *APIClient) SaveMessage(ctx context.Context, chatID string, msg *TelegramMessage) (*MessageSaveResponse, error) {
    jsonData, err := json.Marshal(msg)
    if err != nil {
        return nil, fmt.Errorf("marshal error: %w", err)
    }

    url := fmt.Sprintf("%s/api/telegram-thread/%s/save-message", c.config.APIBaseURL, chatID)
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

    var result MessageSaveResponse
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, fmt.Errorf("decode error: %w", err)
    }

    if !result.Success {
        return nil, fmt.Errorf("save failed: %s", result.Message)
    }

    log.Printf("💾 Message saved for chat %s", chatID)
    return &result, nil
}

// NotifyWebSocket sends real-time notification via WebSocket server
func (c *APIClient) NotifyWebSocket(ctx context.Context, msg *WebSocketMessage) error {
    jsonData, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("marshal error: %w", err)
    }

    url := fmt.Sprintf("%s/api/send-message", c.config.WebSocketServerURL)
    req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        return fmt.Errorf("request creation error: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("request error: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("WebSocket API error %d: %s", resp.StatusCode, string(body))
    }

    log.Printf("📡 WebSocket notification sent for chat %s", msg.TelegramChatID)
    return nil
}
```

**Validation:**
- API calls succeed with valid credentials
- Error handling works correctly
- Logging is informative

---

#### ✅ STEP 2.3: Implement Text Message Handler

**Action:** Create handler for text messages (migrate from bot.js)

**File: handlers.go**
```go
package main

import (
    "context"
    "fmt"
    "log"
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
        Timestamp: time.Now(),
        Type:      "text",
        MediaURL:  "",
        ChatID:    chatID,
    }

    // Save message to backend
    saveResp, err := apiClient.SaveMessage(ctx, chatID, telegramMsg)
    if err != nil {
        log.Printf("❌ Failed to save text message: %v", err)
        return
    }

    // Send WebSocket notification
    if saveResp.Success && saveResp.SavedMessage != nil {
        wsMsg := &WebSocketMessage{
            TelegramChatID: chatID,
            Message:        saveResp.SavedMessage,
        }
        
        if err := apiClient.NotifyWebSocket(ctx, wsMsg); err != nil {
            log.Printf("⚠️ Failed to send WebSocket notification: %v", err)
            // Don't fail the whole operation
        }
    }

    log.Printf("✅ Text message processed for chat %s", chatID)
}

// saveTelegramThread is a helper to create/update threads
func saveTelegramThread(ctx context.Context, chatID, language string) error {
    return apiClient.SaveTelegramThread(ctx, chatID, language)
}
```

**Validation:**
- Text messages are received
- Messages are saved to backend API
- WebSocket notifications are sent
- Errors are logged but don't crash bot

**Node.js Reference:** `apps/telegram-bot/bot.js` lines 122-134

---

### 🔷 PHASE 3: Media Handling & Storage

**Objective:** Implement media file download, upload to S3, and handling

---

#### ✅ STEP 3.1: Initialize S3 Client

**Action:** Create S3/MinIO storage client

**File: storage.go**
```go
package main

import (
    "context"
    "fmt"
    "io"
    "log"
    "net/http"
    "strings"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    awsconfig "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageClient struct {
    s3Client *s3.Client
    bucket   string
    config   *Config
}

func NewStorageClient(cfg *Config) (*StorageClient, error) {
    // Configure S3 client for MinIO/DigitalOcean Spaces
    customResolver := aws.EndpointResolverWithOptionsFunc(
        func(service, region string, options ...interface{}) (aws.Endpoint, error) {
            return aws.Endpoint{
                URL:               cfg.StorageEndpoint,
                HostnameImmutable: true,
                SigningRegion:     cfg.StorageRegion,
            }, nil
        },
    )

    awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
        awsconfig.WithRegion(cfg.StorageRegion),
        awsconfig.WithEndpointResolverWithOptions(customResolver),
        awsconfig.WithCredentialsProvider(
            credentials.NewStaticCredentialsProvider(
                cfg.StorageKey,
                cfg.StorageSecret,
                "",
            ),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
        o.UsePathStyle = true // Important for MinIO
    })

    return &StorageClient{
        s3Client: client,
        bucket:   cfg.StorageBucket,
        config:   cfg,
    }, nil
}

// UploadFile uploads a file to S3/MinIO
func (sc *StorageClient) UploadFile(ctx context.Context, filePath string, data io.Reader, contentType string) error {
    _, err := sc.s3Client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:      aws.String(sc.bucket),
        Key:         aws.String(filePath),
        Body:        data,
        ContentType: aws.String(contentType),
        ACL:         "private",
    })
    
    if err != nil {
        return fmt.Errorf("upload failed: %w", err)
    }

    log.Printf("📤 Uploaded file: %s", filePath)
    return nil
}

// GenerateSignedURL creates a presigned URL for private files
func (sc *StorageClient) GenerateSignedURL(ctx context.Context, filePath string, expiration time.Duration) (string, error) {
    presignClient := s3.NewPresignClient(sc.s3Client)
    
    req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String(sc.bucket),
        Key:    aws.String(filePath),
    }, func(opts *s3.PresignOptions) {
        opts.Expires = expiration
    })
    
    if err != nil {
        return "", fmt.Errorf("failed to generate signed URL: %w", err)
    }

    log.Printf("🔗 Generated signed URL for: %s", filePath)
    return req.URL, nil
}

// buildFilePath creates the correct path structure
func (sc *StorageClient) buildFilePath(mediaType, chatID string, timestamp time.Time, extension string) string {
    // Determine folder based on environment
    folder := "prod"
    if sc.config.Environment == "development" {
        folder = "dev"
    } else if sc.config.Environment == "staging" {
        folder = "staging"
    }

    // Sanitize chat ID
    sanitizedChatID := strings.Map(func(r rune) rune {
        if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || 
           (r >= '0' && r <= '9') || r == '_' || r == '-' {
            return r
        }
        return -1
    }, chatID)

    // Format timestamp
    timeStr := timestamp.Format("2006-01-02T15-04-05")

    return fmt.Sprintf("%s/%s/%s/%s%s", folder, mediaType, sanitizedChatID, timeStr, extension)
}
```

**Validation:**
- S3 client initializes successfully
- Can connect to storage endpoint
- File path generation matches Node.js structure

**Node.js Reference:** `apps/telegram-bot/save-messages/saveImages.js` lines 1-40

---

#### ✅ STEP 3.2: Implement Image Handler

**Action:** Download images from Telegram and upload to S3

**Add to handlers.go:**
```go
// handlePhotoMessage processes incoming photo messages
func handlePhotoMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
    chatID := fmt.Sprintf("%d", msg.Chat.ID)
    caption := ""
    if msg.Caption != nil {
        caption = *msg.Caption
    }

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
    
    err = storageClient.UploadFile(ctx, filePath, imageData, "image/jpeg")
    if err != nil {
        log.Printf("❌ Failed to upload image: %v", err)
        return
    }

    // Save message with media URL
    telegramMsg := &TelegramMessage{
        Text:      caption,
        Sender:    "patient",
        Timestamp: timestamp,
        Type:      "image",
        MediaURL:  filePath,
        ChatID:    chatID,
    }

    saveResp, err := apiClient.SaveMessage(ctx, chatID, telegramMsg)
    if err != nil {
        log.Printf("❌ Failed to save image message: %v", err)
        return
    }

    // Send WebSocket notification
    if saveResp.Success && saveResp.SavedMessage != nil {
        wsMsg := &WebSocketMessage{
            TelegramChatID: chatID,
            Message:        saveResp.SavedMessage,
        }
        apiClient.NotifyWebSocket(ctx, wsMsg)
    }

    log.Printf("✅ Image message processed for chat %s", chatID)
}

// downloadFile downloads a file from a URL
func downloadFile(ctx context.Context, url string) (io.Reader, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := httpClient.Do(req)
    if err != nil {
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

    return bytes.NewReader(data), nil
}
```

**Validation:**
- Images are downloaded from Telegram
- Images are uploaded to correct S3 path
- Captions are preserved
- Message saved with media URL

**Node.js Reference:** `apps/telegram-bot/bot.js` lines 76-99

---

#### ✅ STEP 3.3: Implement Video Handler

**Action:** Handle video messages

**Add to handlers.go:**
```go
// handleVideoMessage processes incoming video messages
func handleVideoMessage(ctx context.Context, b *bot.Bot, msg *models.Message) {
    chatID := fmt.Sprintf("%d", msg.Chat.ID)
    caption := ""
    if msg.Caption != nil {
        caption = *msg.Caption
    }

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
    
    err = storageClient.UploadFile(ctx, filePath, videoData, "video/mp4")
    if err != nil {
        log.Printf("❌ Failed to upload video: %v", err)
        return
    }

    // Save message
    telegramMsg := &TelegramMessage{
        Text:      caption,
        Sender:    "patient",
        Timestamp: timestamp,
        Type:      "video",
        MediaURL:  filePath,
        ChatID:    chatID,
    }

    saveResp, err := apiClient.SaveMessage(ctx, chatID, telegramMsg)
    if err != nil {
        log.Printf("❌ Failed to save video message: %v", err)
        return
    }

    // Send WebSocket notification
    if saveResp.Success && saveResp.SavedMessage != nil {
        wsMsg := &WebSocketMessage{
            TelegramChatID: chatID,
            Message:        saveResp.SavedMessage,
        }
        apiClient.NotifyWebSocket(ctx, wsMsg)
    }

    log.Printf("✅ Video message processed for chat %s", chatID)
}
```

**Validation:**
- Videos download and upload correctly
- File paths follow environment structure

**Node.js Reference:** `apps/telegram-bot/bot.js` lines 102-119

---

#### ✅ STEP 3.4: Implement Audio/Voice Handler

**Action:** Handle audio and voice messages

**Add to handlers.go:**
```go
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
    // Use generic extension since audio format can vary
    filePath := storageClient.buildFilePath("audio", chatID, timestamp, "")
    
    err = storageClient.UploadFile(ctx, filePath, audioData, "application/octet-stream")
    if err != nil {
        log.Printf("❌ Failed to upload audio: %v", err)
        return
    }

    // Save message
    telegramMsg := &TelegramMessage{
        Text:      "",
        Sender:    "patient",
        Timestamp: timestamp,
        Type:      "audio",
        MediaURL:  filePath,
        ChatID:    chatID,
    }

    saveResp, err := apiClient.SaveMessage(ctx, chatID, telegramMsg)
    if err != nil {
        log.Printf("❌ Failed to save audio message: %v", err)
        return
    }

    // Send WebSocket notification
    if saveResp.Success && saveResp.SavedMessage != nil {
        wsMsg := &WebSocketMessage{
            TelegramChatID: chatID,
            Message:        saveResp.SavedMessage,
        }
        apiClient.NotifyWebSocket(ctx, wsMsg)
    }

    log.Printf("✅ Audio message processed for chat %s", chatID)
}
```

**Validation:**
- Both audio and voice messages work
- Files upload to correct paths

**Node.js Reference:** `apps/telegram-bot/bot.js` lines 122-145, `save-messages/saveAudio.js`

---

### 🔷 PHASE 4: Command Handlers

**Objective:** Implement bot commands like /url

---

#### ✅ STEP 4.1: Implement /url Command

**Action:** Generate and send intake form URL

**Add to api.go:**
```go
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
```

**Add to handlers.go:**
```go
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

    // Construct full URL
    registrationURL := fmt.Sprintf("%s/telegram-patient/%s", config.APIBaseURL, token)

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
```

**Update main.go to register command:**
```go
// In main() after bot creation, before b.Start():
b.RegisterHandler(bot.HandlerTypeMessageText, "/url", bot.MatchTypeExact, 
    func(ctx context.Context, b *bot.Bot, update *models.Update) {
        if update.Message != nil {
            handleURLCommand(ctx, b, update.Message)
        }
    },
)
```

**Validation:**
- /url command responds with link
- Link contains valid token
- Error messages display correctly

**Node.js Reference:** `apps/telegram-bot/send-url.js`

---

### 🔷 PHASE 5: CRON Job Migration

**Objective:** Implement follow-up message scheduler

---

#### ✅ STEP 5.1: Create CRON Module

**Action:** Implement scheduled follow-up messages

**File: cron.go**
```go
package main

import (
    "context"
    "fmt"
    "log"
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

    if resp.StatusCode != http.StatusOK {
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

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
    }

    log.Printf("💾 Follow-up record saved for chat %s", chatID)
    return nil
}
```

**Create standalone CRON executable:**

**File: cmd/followup-cron/main.go**
```go
package main

import (
    "context"
    "log"
    "os"

    "github.com/go-telegram/bot"
    
    // Import parent package (adjust import path)
    app "telegram-bot-go"
)

func main() {
    log.SetFlags(log.LstdFlags)
    log.SetPrefix("[FOLLOW-UP-CRON] ")

    // Load config
    config, err := app.LoadConfig()
    if err != nil {
        log.Fatalf("Configuration error: %v", err)
    }

    // Create bot instance
    b, err := bot.New(config.TelegramToken)
    if err != nil {
        log.Fatalf("Failed to create bot: %v", err)
    }

    // Create API client
    apiClient := app.NewAPIClient(config)

    // Create and run CRON
    cron := app.NewFollowUpCron(b, apiClient, config)
    
    ctx := context.Background()
    if err := cron.Run(ctx); err != nil {
        log.Fatalf("CRON job failed: %v", err)
        os.Exit(1)
    }

    log.Println("✅ CRON job completed successfully")
}
```

**Validation:**
- CRON job runs successfully
- Follow-up messages sent to correct chats
- Duplicate follow-ups prevented
- Records saved correctly

**Node.js Reference:** `apps/telegram-bot/followUpCron.js`

---

### 🔷 PHASE 6: Testing & Validation

**Objective:** Comprehensive testing before deployment

---

#### ✅ STEP 6.1: Unit Testing

**Action:** Create test files for critical functions

**File: handlers_test.go**
```go
package main

import (
    "testing"
    "time"
)

func TestBuildFilePath(t *testing.T) {
    cfg := &Config{Environment: "development"}
    sc := &StorageClient{config: cfg}
    
    timestamp := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
    path := sc.buildFilePath("images", "123456", timestamp, ".jpg")
    
    expected := "dev/images/123456/2024-01-15T10-30-00.jpg"
    if path != expected {
        t.Errorf("Expected %s, got %s", expected, path)
    }
}

func TestConfigValidation(t *testing.T) {
    // Test missing required fields
    os.Clearenv()
    
    _, err := LoadConfig()
    if err == nil {
        t.Error("Expected error for missing config, got nil")
    }
}
```

**Run tests:**
```bash
go test -v ./...
```

**Validation:**
- All tests pass
- Edge cases handled

---

#### ✅ STEP 6.2: Integration Testing

**Action:** Test with real Telegram bot

**Test Checklist:**
- [ ] Send text message → saved correctly
- [ ] Send image with caption → uploaded to S3, saved
- [ ] Send video → uploaded and saved
- [ ] Send voice message → uploaded and saved
- [ ] Send /url command → receive valid link
- [ ] Multiple messages in succession → all processed
- [ ] Invalid credentials → proper error handling
- [ ] Network failure → graceful degradation
- [ ] Bot restart → picks up where it left off

---

#### ✅ STEP 6.3: Performance Testing

**Action:** Verify performance improvements

**Metrics to measure:**
- Memory usage (Go should be lower)
- CPU usage during message processing
- File upload speed
- Concurrent message handling
- Bot response latency

**Tools:**
```bash
# Memory profiling
go test -memprofile=mem.prof

# CPU profiling
go test -cpuprofile=cpu.prof

# Runtime metrics
go run main.go # Monitor with htop/Activity Monitor
```

---

### 🔷 PHASE 7: Deployment & Cutover

**Objective:** Deploy Go bot and transition from Node.js

---

#### ✅ STEP 7.1: Build Production Binary

**Action:** Compile optimized binary

**File: Makefile**
```makefile
.PHONY: build run test clean

# Build for production
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o telegram-bot-go main.go

# Build follow-up CRON
build-cron:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o followup-cron cmd/followup-cron/main.go

# Run locally
run:
	go run main.go

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -f telegram-bot-go followup-cron

# Docker build
docker-build:
	docker build -t telegram-bot-go:latest .
```

**Build commands:**
```bash
make build
make build-cron
```

**Validation:**
- Binaries created successfully
- File sizes reasonable (< 20MB typically)
- Binaries run on target platform

---

#### ✅ STEP 7.2: Update Dockerfile

**Action:** Create optimized Docker image

**File: Dockerfile**
```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binaries
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o telegram-bot-go .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o followup-cron ./cmd/followup-cron

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binaries from builder
COPY --from=builder /app/telegram-bot-go .
COPY --from=builder /app/followup-cron .

# Run bot by default
CMD ["./telegram-bot-go"]
```

**Build and test:**
```bash
docker build -t telegram-bot-go:latest .
docker run --env-file .env telegram-bot-go:latest
```

---

#### ✅ STEP 7.3: Update docker-compose.yml

**Action:** Replace Node.js service with Go service

**Before (Node.js):**
```yaml
telegram-bot:
  build:
    context: ./apps/telegram-bot
    dockerfile: Dockerfile
  command: npm run start:bot
  environment:
    - NODE_ENV=${NODE_ENV}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    # ... other env vars
```

**After (Go):**
```yaml
telegram-bot:
  build:
    context: ./apps/telegram-bot-go
    dockerfile: Dockerfile
  command: ./telegram-bot-go
  environment:
    - NODE_ENV=${NODE_ENV}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    # ... other env vars (same as before)
  restart: unless-stopped
  
telegram-bot-cron:
  build:
    context: ./apps/telegram-bot-go
    dockerfile: Dockerfile
  command: ./followup-cron
  environment:
    - NODE_ENV=${NODE_ENV}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    # ... other env vars
  # Run via external cron scheduler, not as daemon
  restart: "no"
```

---

#### ✅ STEP 7.4: Cutover Plan

**Action:** Transition from Node.js to Go

**Pre-cutover:**
1. [ ] Back up current production data
2. [ ] Document current bot state
3. [ ] Prepare rollback plan
4. [ ] Test Go bot in staging environment
5. [ ] Monitor staging for 24 hours

**Cutover Steps:**
1. [ ] Stop Node.js bot: `docker-compose stop telegram-bot`
2. [ ] Verify no pending messages
3. [ ] Deploy Go bot: `docker-compose up -d telegram-bot`
4. [ ] Verify bot responds to test message
5. [ ] Monitor logs for 30 minutes
6. [ ] Send test messages of each type
7. [ ] Verify S3 uploads
8. [ ] Test /url command
9. [ ] Verify WebSocket notifications

**Post-cutover:**
1. [ ] Monitor for 24 hours
2. [ ] Check error logs
3. [ ] Verify all features working
4. [ ] Update documentation
5. [ ] Remove Node.js code (after 1 week stable)

---

## Verification Checklist

### ✅ Feature Parity

- [ ] Text messages received and saved
- [ ] Images downloaded, uploaded to S3, saved with captions
- [ ] Videos processed correctly
- [ ] Audio/voice messages handled
- [ ] Thread creation on first message
- [ ] WebSocket notifications sent
- [ ] /url command generates valid links
- [ ] Follow-up CRON job sends messages
- [ ] Follow-up deduplication works
- [ ] Environment-based folder structure (dev/staging/prod)
- [ ] Private file access via signed URLs
- [ ] Authorization with MEDFLOW_KEY
- [ ] Proper error handling and logging

### ✅ Performance

- [ ] Memory usage lower than Node.js version
- [ ] CPU usage acceptable
- [ ] Message processing latency < 2 seconds
- [ ] File uploads complete successfully
- [ ] No memory leaks after 24 hours
- [ ] Concurrent messages handled properly

### ✅ Reliability

- [ ] Bot recovers from API failures
- [ ] No crashes under normal load
- [ ] Graceful shutdown on SIGINT
- [ ] Logs are informative
- [ ] Errors don't stop message processing

---

## Rollback Plan

### If Issues Occur

**Immediate Rollback (< 5 minutes):**
```bash
# Stop Go bot
docker-compose stop telegram-bot

# Start Node.js bot
docker-compose -f docker-compose.old.yml up -d telegram-bot

# Verify
docker-compose logs -f telegram-bot
```

**Data Considerations:**
- Messages sent during Go bot operation are already in database
- No data migration needed for rollback
- Bot state is stateless (no local data)

**When to Rollback:**
- Critical bugs affecting message processing
- Data loss or corruption
- Performance significantly worse than Node.js
- Security vulnerabilities discovered

---

## Common Issues & Solutions

### Issue: Bot doesn't respond to messages

**Diagnosis:**
```bash
docker-compose logs telegram-bot | grep ERROR
```

**Solutions:**
- Check TELEGRAM_BOT_TOKEN is correct
- Verify bot has network access
- Check Telegram API status

### Issue: Files not uploading to S3

**Diagnosis:**
- Check S3 credentials
- Verify endpoint URL format
- Test with AWS CLI

**Solutions:**
- Ensure `forcePathStyle: true` for MinIO
- Check bucket permissions
- Verify endpoint has `https://`

### Issue: Messages not saving to backend

**Diagnosis:**
- Check API_BASE_URL
- Verify MEDFLOW_KEY
- Test API endpoint with curl