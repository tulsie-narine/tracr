GOOS=windows
GOARCH=amd64

# Version information (can be overridden)
VERSION ?= dev
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Build flags
LDFLAGS := -X 'github.com/tracr/agent/pkg/version.Version=$(VERSION)' \
           -X 'github.com/tracr/agent/pkg/version.BuildDate=$(BUILD_DATE)' \
           -X 'github.com/tracr/agent/pkg/version.GitCommit=$(GIT_COMMIT)'

# Directories
BUILD_DIR := build
INSTALLER_DIR := installer

.PHONY: all build test lint clean install-dev uninstall-dev deps

all: build

deps:
	go mod download
	go mod tidy

build: deps
	@echo "Building unified agent for Windows..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/agent.exe ./

test:
	@echo "Running tests..."
	go test -v ./...

test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	@echo "Running linter..."
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run

clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	rm -rf $(INSTALLER_DIR)/*.msi
	rm -rf $(INSTALLER_DIR)/*.wixobj
	rm -rf $(INSTALLER_DIR)/*.wixpdb
	rm -f coverage.out coverage.html

# Development service management (Windows only)
install-dev: build
	@echo "Installing agent as Windows service (development)..."
	$(BUILD_DIR)/agent.exe -install

uninstall-dev:
	@echo "Uninstalling agent Windows service..."
	$(BUILD_DIR)/agent.exe -uninstall

start-dev:
	@echo "Starting agent service..."
	$(BUILD_DIR)/agent.exe -start

stop-dev:
	@echo "Stopping agent service..."
	$(BUILD_DIR)/agent.exe -stop

# Console mode for development/testing
run-console: build
	@echo "Running agent in console mode..."
	$(BUILD_DIR)/agent.exe

# MSI building (requires WiX Toolset)
msi: build
	@echo "Building MSI installer..."
	@if [ ! -d "$(INSTALLER_DIR)" ]; then echo "Installer directory not found"; exit 1; fi
	cd $(INSTALLER_DIR) && ./build.bat $(VERSION)

# Cross-platform compatibility note
ifeq ($(shell uname -s),Darwin)
install-dev uninstall-dev start-dev stop-dev:
	@echo "Windows service commands are not available on macOS"
	@echo "Use 'make run-console' for local testing"
	@exit 1
endif

ifeq ($(shell uname -s),Linux)
install-dev uninstall-dev start-dev stop-dev:
	@echo "Windows service commands are not available on Linux"
	@echo "Use 'make run-console' for local testing"
	@exit 1
endif

# Help target
help:
	@echo "Available targets:"
	@echo "  build         - Build the agent binary for Windows"
	@echo "  test          - Run unit tests"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  lint          - Run linter"
	@echo "  clean         - Clean build artifacts"
	@echo "  run-console   - Run agent in console mode (development)"
	@echo ""
	@echo "Windows service management (Windows only):"
	@echo "  install-dev   - Install agent as Windows service"
	@echo "  uninstall-dev - Uninstall agent service"
	@echo "  start-dev     - Start agent service"
	@echo "  stop-dev      - Stop agent service"
	@echo ""
	@echo "Installer:"
	@echo "  msi          - Build MSI installer (requires WiX Toolset)"
	@echo ""
	@echo "Variables:"
	@echo "  VERSION      - Version string (default: dev)"