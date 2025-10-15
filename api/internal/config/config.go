package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server configuration
	Port        int    `json:"port"`
	TLSCertFile string `json:"tls_cert_file"`
	TLSKeyFile  string `json:"tls_key_file"`

	// Database configuration
	DatabasePath string `json:"database_path"`

	// JWT configuration
	JWTSecret string `json:"jwt_secret"`
	JWTExpiry time.Duration `json:"jwt_expiry"`

	// Rate limiting
	RateLimitEnabled bool `json:"rate_limit_enabled"`
	AgentRateLimit   int  `json:"agent_rate_limit"`   // requests per minute per device
	WebRateLimit     int  `json:"web_rate_limit"`     // requests per minute per user

	// Token rotation
	TokenRotationInterval time.Duration `json:"token_rotation_interval"`

	// Logging
	LogLevel string `json:"log_level"`

	// Payload limits
	MaxPayloadSize int64 `json:"max_payload_size"`
}

func Load() (*Config, error) {
	cfg := &Config{
		// Default values
		Port:                  8443,
		JWTExpiry:            24 * time.Hour,
		RateLimitEnabled:     true,
		AgentRateLimit:       100, // 100 requests per minute per device
		WebRateLimit:         1000, // 1000 requests per minute per user
		TokenRotationInterval: 30 * 24 * time.Hour, // 30 days
		LogLevel:             "INFO",
		MaxPayloadSize:       10 * 1024 * 1024, // 10MB
	}

	// Load from environment variables
	if port := os.Getenv("PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			cfg.Port = p
		}
	}

	cfg.TLSCertFile = os.Getenv("TLS_CERT_FILE")
	cfg.TLSKeyFile = os.Getenv("TLS_KEY_FILE")

	cfg.DatabasePath = os.Getenv("DATABASE_PATH")
	if cfg.DatabasePath == "" {
		// Default for development
		cfg.DatabasePath = "./data/tracr.db"
	}

	cfg.JWTSecret = os.Getenv("JWT_SECRET")
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	if jwtExpiry := os.Getenv("JWT_EXPIRY"); jwtExpiry != "" {
		if duration, err := time.ParseDuration(jwtExpiry); err == nil {
			cfg.JWTExpiry = duration
		}
	}

	if rateLimitEnabled := os.Getenv("RATE_LIMIT_ENABLED"); rateLimitEnabled != "" {
		cfg.RateLimitEnabled = rateLimitEnabled == "true"
	}

	if agentRateLimit := os.Getenv("AGENT_RATE_LIMIT"); agentRateLimit != "" {
		if limit, err := strconv.Atoi(agentRateLimit); err == nil {
			cfg.AgentRateLimit = limit
		}
	}

	if webRateLimit := os.Getenv("WEB_RATE_LIMIT"); webRateLimit != "" {
		if limit, err := strconv.Atoi(webRateLimit); err == nil {
			cfg.WebRateLimit = limit
		}
	}

	if tokenRotation := os.Getenv("TOKEN_ROTATION_INTERVAL"); tokenRotation != "" {
		if duration, err := time.ParseDuration(tokenRotation); err == nil {
			cfg.TokenRotationInterval = duration
		}
	}

	if logLevel := os.Getenv("LOG_LEVEL"); logLevel != "" {
		cfg.LogLevel = logLevel
	}

	if maxPayload := os.Getenv("MAX_PAYLOAD_SIZE"); maxPayload != "" {
		if size, err := strconv.ParseInt(maxPayload, 10, 64); err == nil {
			cfg.MaxPayloadSize = size
		}
	}

	// Validate required fields
	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}

	if c.DatabasePath == "" {
		return fmt.Errorf("database path is required")
	}

	if c.JWTSecret == "" {
		return fmt.Errorf("JWT secret is required")
	}

	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT secret must be at least 32 characters")
	}

	if c.JWTExpiry < time.Minute {
		return fmt.Errorf("JWT expiry must be at least 1 minute")
	}

	if c.MaxPayloadSize < 1024 {
		return fmt.Errorf("max payload size must be at least 1KB")
	}

	return nil
}