package test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/tracr/agent/internal/client"
	"github.com/tracr/agent/internal/config"
)

func TestClient(t *testing.T) {
	t.Run("Register", func(t *testing.T) {
		// Mock server
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/v1/agents/register" {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			
			if r.Method != "POST" {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			
			response := client.RegisterResponse{
				DeviceID:    "test-device-123",
				DeviceToken: "test-token-456",
			}
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}))
		defer server.Close()
		
		// Create client with test server URL
		cfg := &config.Config{
			APIEndpoint:    server.URL,
			RequestTimeout: 10 * time.Second,
		}
		
		c := client.New(cfg)
		
		// Test registration
		resp, err := c.Register("test-hostname", "Windows 11", "1.0.0")
		if err != nil {
			t.Fatalf("Register failed: %v", err)
		}
		
		if resp.DeviceID != "test-device-123" {
			t.Errorf("Expected device ID 'test-device-123', got '%s'", resp.DeviceID)
		}
		
		if resp.DeviceToken != "test-token-456" {
			t.Errorf("Expected device token 'test-token-456', got '%s'", resp.DeviceToken)
		}
	})
	
	t.Run("SendInventory", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/v1/agents/test-device/inventory" {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			
			if r.Method != "POST" {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			
			// Verify Authorization header
			auth := r.Header.Get("Authorization")
			if auth != "Bearer test-token" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			
			w.WriteHeader(http.StatusCreated)
		}))
		defer server.Close()
		
		cfg := &config.Config{
			APIEndpoint:    server.URL,
			DeviceToken:    "test-token",
			RequestTimeout: 10 * time.Second,
		}
		
		c := client.New(cfg)
		
		// Test inventory submission
		inventory := map[string]interface{}{
			"hostname": "test-pc",
			"os":       "Windows 11",
		}
		
		err := c.SendInventory("test-device", inventory)
		if err != nil {
			t.Fatalf("SendInventory failed: %v", err)
		}
	})
	
	t.Run("RetryLogic", func(t *testing.T) {
		attemptCount := 0
		
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			attemptCount++
			
			// Fail first two attempts, succeed on third
			if attemptCount < 3 {
				http.Error(w, "server error", http.StatusInternalServerError)
				return
			}
			
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()
		
		cfg := &config.Config{
			APIEndpoint:       server.URL,
			DeviceToken:       "test-token",
			RequestTimeout:    5 * time.Second,
			MaxRetries:        3,
			BackoffMultiplier: 2.0,
			MaxBackoffTime:    10 * time.Second,
		}
		
		c := client.New(cfg)
		
		// This should succeed after retries
		err := c.Heartbeat("test-device")
		if err != nil {
			t.Fatalf("Heartbeat failed after retries: %v", err)
		}
		
		if attemptCount != 3 {
			t.Errorf("Expected 3 attempts, got %d", attemptCount)
		}
	})
	
	t.Run("Timeout", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Simulate slow server
			time.Sleep(2 * time.Second)
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()
		
		cfg := &config.Config{
			APIEndpoint:    server.URL,
			DeviceToken:    "test-token",
			RequestTimeout: 500 * time.Millisecond, // Short timeout
			MaxRetries:     1,
		}
		
		c := client.New(cfg)
		
		// This should timeout
		err := c.Heartbeat("test-device")
		if err == nil {
			t.Fatal("Expected timeout error")
		}
	})
	
	t.Run("PollCommands", func(t *testing.T) {
		server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			commands := []client.Command{
				{
					ID:          "cmd-123",
					CommandType: "refresh_now",
					Payload:     json.RawMessage(`{}`),
					CreatedAt:   time.Now(),
				},
			}
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(commands)
		}))
		defer server.Close()
		
		cfg := &config.Config{
			APIEndpoint:    server.URL,
			DeviceToken:    "test-token",
			RequestTimeout: 10 * time.Second,
		}
		
		c := client.New(cfg)
		
		commands, err := c.PollCommands("test-device")
		if err != nil {
			t.Fatalf("PollCommands failed: %v", err)
		}
		
		if len(commands) != 1 {
			t.Fatalf("Expected 1 command, got %d", len(commands))
		}
		
		if commands[0].ID != "cmd-123" {
			t.Errorf("Expected command ID 'cmd-123', got '%s'", commands[0].ID)
		}
		
		if commands[0].CommandType != "refresh_now" {
			t.Errorf("Expected command type 'refresh_now', got '%s'", commands[0].CommandType)
		}
	})
}