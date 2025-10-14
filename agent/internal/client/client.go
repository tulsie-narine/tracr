package client

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/logger"
)

type Client struct {
	config     *config.Config
	httpClient *http.Client
}

type RegisterRequest struct {
	Hostname     string `json:"hostname"`
	OSVersion    string `json:"os_version"`
	AgentVersion string `json:"agent_version"`
}

type RegisterResponse struct {
	DeviceID    string `json:"device_id"`
	DeviceToken string `json:"device_token"`
}

type Command struct {
	ID          string          `json:"id"`
	CommandType string          `json:"command_type"`
	Payload     json.RawMessage `json:"payload"`
	CreatedAt   time.Time       `json:"created_at"`
}

type CommandResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func New(cfg *config.Config) *Client {
	// Create HTTP client with TLS configuration
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
		MaxIdleConns:        10,
		IdleConnTimeout:     30 * time.Second,
		DisableCompression:  false,
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   cfg.RequestTimeout,
	}

	return &Client{
		config:     cfg,
		httpClient: httpClient,
	}
}

func (c *Client) Register(hostname, osVersion, agentVersion string) (*RegisterResponse, error) {
	req := RegisterRequest{
		Hostname:     hostname,
		OSVersion:    osVersion,
		AgentVersion: agentVersion,
	}

	url := fmt.Sprintf("%s/v1/agents/register", c.config.APIEndpoint)
	
	var response RegisterResponse
	if err := c.doRequest("POST", url, req, &response, false); err != nil {
		return nil, fmt.Errorf("register request failed: %w", err)
	}

	return &response, nil
}

func (c *Client) SendInventory(deviceID string, inventory interface{}) error {
	url := fmt.Sprintf("%s/v1/agents/%s/inventory", c.config.APIEndpoint, deviceID)
	
	if err := c.doRequest("POST", url, inventory, nil, true); err != nil {
		return fmt.Errorf("send inventory request failed: %w", err)
	}

	return nil
}

func (c *Client) Heartbeat(deviceID string) error {
	url := fmt.Sprintf("%s/v1/agents/%s/heartbeat", c.config.APIEndpoint, deviceID)
	
	heartbeatData := map[string]interface{}{
		"timestamp": time.Now(),
	}

	if err := c.doRequest("POST", url, heartbeatData, nil, true); err != nil {
		return fmt.Errorf("heartbeat request failed: %w", err)
	}

	return nil
}

func (c *Client) PollCommands(deviceID string) ([]Command, error) {
	url := fmt.Sprintf("%s/v1/agents/%s/commands", c.config.APIEndpoint, deviceID)
	
	var commands []Command
	if err := c.doRequest("GET", url, nil, &commands, true); err != nil {
		return nil, fmt.Errorf("poll commands request failed: %w", err)
	}

	return commands, nil
}

func (c *Client) AckCommand(deviceID, commandID string, result CommandResult) error {
	url := fmt.Sprintf("%s/v1/agents/%s/commands/%s/ack", c.config.APIEndpoint, deviceID, commandID)
	
	if err := c.doRequest("POST", url, result, nil, true); err != nil {
		return fmt.Errorf("ack command request failed: %w", err)
	}

	return nil
}

func (c *Client) doRequest(method, url string, requestBody interface{}, responseBody interface{}, requireAuth bool) error {
	return c.doRequestWithRetry(method, url, requestBody, responseBody, requireAuth, c.config.MaxRetries)
}

func (c *Client) doRequestWithRetry(method, url string, requestBody interface{}, responseBody interface{}, requireAuth bool, retriesLeft int) error {
	var body io.Reader
	
	if requestBody != nil {
		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", fmt.Sprintf("Tracr-Agent/%s", "1.0.0")) // TODO: Use actual version

	// Add authentication header if required
	if requireAuth && c.config.DeviceToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.DeviceToken))
	}

	logger.Debug("Making HTTP request", "method", method, "url", url, "auth", requireAuth)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Retry on network errors
		if retriesLeft > 0 {
			backoffDuration := c.calculateBackoff(c.config.MaxRetries - retriesLeft)
			logger.Debug("Request failed, retrying", "error", err, "backoff", backoffDuration, "retriesLeft", retriesLeft-1)
			time.Sleep(backoffDuration)
			return c.doRequestWithRetry(method, url, requestBody, responseBody, requireAuth, retriesLeft-1)
		}
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	logger.Debug("Received HTTP response", "status", resp.StatusCode, "size", len(respBody))

	// Handle HTTP errors
	if resp.StatusCode >= 400 {
		// Retry on 5xx errors (server errors)
		if resp.StatusCode >= 500 && retriesLeft > 0 {
			backoffDuration := c.calculateBackoff(c.config.MaxRetries - retriesLeft)
			logger.Debug("Server error, retrying", "status", resp.StatusCode, "backoff", backoffDuration, "retriesLeft", retriesLeft-1)
			time.Sleep(backoffDuration)
			return c.doRequestWithRetry(method, url, requestBody, responseBody, requireAuth, retriesLeft-1)
		}

		return fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse response body if expected
	if responseBody != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, responseBody); err != nil {
			return fmt.Errorf("failed to unmarshal response body: %w", err)
		}
	}

	return nil
}

func (c *Client) calculateBackoff(attempt int) time.Duration {
	// Exponential backoff: base * multiplier^attempt
	// Start at 1 second, multiply by backoff multiplier each attempt
	base := 1.0 // 1 second
	backoff := base * math.Pow(c.config.BackoffMultiplier, float64(attempt))
	
	duration := time.Duration(backoff) * time.Second
	
	// Cap at maximum backoff time
	if duration > c.config.MaxBackoffTime {
		duration = c.config.MaxBackoffTime
	}

	return duration
}