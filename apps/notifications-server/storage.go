package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"bytes"
	"net/url"
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
	// Normalize endpoint into full URL (scheme required by AWS SDK)
	endpoint := cfg.StorageEndpoint
	if endpoint == "" {
		return nil, fmt.Errorf("storage endpoint is empty")
	}
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = "http://" + endpoint
	}
	// Validate final URL
	if _, err := url.Parse(endpoint); err != nil {
		return nil, fmt.Errorf("invalid storage endpoint: %w", err)
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(
		func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               endpoint,
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

	log.Printf("🗄️ Object storage client initialized | endpoint: %s | region: %s | bucket: %s | key: %s",
		endpoint, cfg.StorageRegion, cfg.StorageBucket, maskKey(cfg.StorageKey))

	return &StorageClient{
		s3Client: client,
		bucket:   cfg.StorageBucket,
		config:   cfg,
	}, nil
}

func maskKey(key string) string {
	if len(key) <= 4 {
		return "***"
	}
	return key[:2] + "***" + key[len(key)-2:]
}

// UploadFile uploads a file to S3/MinIO
func (sc *StorageClient) UploadFile(ctx context.Context, filePath string, data io.Reader, contentType string) error {
	var sizeInfo string
	if br, ok := data.(*bytes.Reader); ok {
		sizeInfo = fmt.Sprintf(" | size(bytes): %d", br.Len())
	}
	log.Printf("⬆️ Upload attempt | bucket: %s | key: %s | content-type: %s%s",
		sc.bucket, filePath, contentType, sizeInfo)

	_, err := sc.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(sc.bucket),
		Key:         aws.String(filePath),
		Body:        data,
		ContentType: aws.String(contentType),
		ACL:         "private",
	})

	if err != nil {
		log.Printf("❌ Upload error | bucket: %s | key: %s | endpoint: %s | err: %v",
			sc.bucket, filePath, sc.config.StorageEndpoint, err)
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
