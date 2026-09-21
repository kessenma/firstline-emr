.PHONY: build run test clean

# Build for production
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o telegram-bot-go .

# Run locally
run:
	go run .

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -f telegram-bot-go

# Docker build
docker-build:
	docker build -t telegram-bot-go:latest .

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Tidy dependencies
tidy:
	go mod tidy
