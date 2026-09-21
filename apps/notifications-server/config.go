package main

import (
	"fmt"
	"os"
)

type Config struct {
	TelegramToken    string
	MedFlowKey       string
	APIBaseURL       string
	PublicURL        string
	Port             string
	StorageEndpoint  string
	StorageRegion    string
	StorageBucket    string
	StorageKey       string
	StorageSecret    string
	Environment      string
	GorushURL        string
	GorushSandboxURL string
	DatabaseURL      string
}

func LoadConfig() (*Config, error) {
	cfg := &Config{
		TelegramToken:   os.Getenv("TELEGRAM_BOT_TOKEN"),
		MedFlowKey:      os.Getenv("MEDFLOW_KEY"),
		APIBaseURL:      os.Getenv("API_BASE_URL"),
		PublicURL:       os.Getenv("PUBLIC_URL"),
		Port:            os.Getenv("NOTIFICATIONS_PORT"),
		StorageEndpoint: os.Getenv("OBJECT_STORAGE_ENDPOINT"),
		StorageRegion:   os.Getenv("OBJECT_STORAGE_REGION"),
		StorageBucket:   os.Getenv("OBJECT_STORAGE_BUCKET"),
		StorageKey:      os.Getenv("OBJECT_STORAGE_KEY"),
		StorageSecret:   os.Getenv("OBJECT_STORAGE_SECRET"),
		Environment:     os.Getenv("NODE_ENV"),
		GorushURL:       os.Getenv("GORUSH_URL"),
		// Second Gorush bound to the APNs sandbox gateway. Optional: unset
		// means dev-registered tokens fall back to the production instance,
		// which is the pre-split behaviour.
		GorushSandboxURL: os.Getenv("GORUSH_SANDBOX_URL"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
	}

	// Set defaults
	if cfg.Environment == "" {
		cfg.Environment = "development"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.StorageRegion == "" {
		cfg.StorageRegion = "us-east-1"
	}
	if cfg.GorushURL == "" {
		cfg.GorushURL = "http://gorush:8088"
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
