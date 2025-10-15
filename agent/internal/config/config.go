package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	DefaultConfigPath = `C:\ProgramData\TracrAgent\config.json`
	DefaultDataDir    = `C:\ProgramData\TracrAgent\data`
	DefaultLogDir     = `C:\ProgramData\TracrAgent\logs`
)

type Config struct {
	// API Configuration
	APIEndpoint string `json:"api_endpoint"`
	DeviceID    string `json:"device_id,omitempty"`
	DeviceToken string `json:"device_token,omitempty"`

	// Collection Settings
	CollectionInterval time.Duration `json:"collection_interval"`
	JitterPercent      float64       `json:"jitter_percent"`

	// Retry Settings
	MaxRetries       int           `json:"max_retries"`
	BackoffMultiplier float64       `json:"backoff_multiplier"`
	MaxBackoffTime    time.Duration `json:"max_backoff_time"`

	// Storage Settings
	DataDir      string `json:"data_dir"`
	SnapshotPath string `json:"snapshot_path"`

	// Logging
	LogLevel string `json:"log_level"`
	LogDir   string `json:"log_dir"`

	// Network Settings
	RequestTimeout    time.Duration `json:"request_timeout"`
	HeartbeatInterval time.Duration `json:"heartbeat_interval"`
	CommandPollInterval time.Duration `json:"command_poll_interval"`
}

func DefaultConfig() *Config {
	return &Config{
		APIEndpoint:         "https://web-production-c4a4.up.railway.app",
		CollectionInterval:  15 * time.Minute,
		JitterPercent:       0.1,
		MaxRetries:         5,
		BackoffMultiplier:  2.0,
		MaxBackoffTime:     5 * time.Minute,
		DataDir:            DefaultDataDir,
		SnapshotPath:       filepath.Join(DefaultDataDir, "snapshots"),
		LogLevel:           "INFO",
		LogDir:             DefaultLogDir,
		RequestTimeout:     30 * time.Second,
		HeartbeatInterval:  5 * time.Minute,
		CommandPollInterval: 60 * time.Second,
	}
}

func Load() (*Config, error) {
	cfg := DefaultConfig()

	// Try to load from config file
	configPath := getConfigPath()
	if _, err := os.Stat(configPath); err == nil {
		if err := loadFromFile(cfg, configPath); err != nil {
			return nil, fmt.Errorf("failed to load config from file: %w", err)
		}
	}

	// Override with environment variables
	loadFromEnv(cfg)

	// Create necessary directories
	if err := createDirectories(cfg); err != nil {
		return nil, fmt.Errorf("failed to create directories: %w", err)
	}

	return cfg, nil
}

func (c *Config) Save() error {
	configPath := getConfigPath()
	
	// Create directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

func getConfigPath() string {
	if path := os.Getenv("TRACR_CONFIG_PATH"); path != "" {
		return path
	}
	return DefaultConfigPath
}

func loadFromFile(cfg *Config, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	// Create a temporary struct to handle duration parsing
	var temp struct {
		APIEndpoint         string  `json:"api_endpoint"`
		DeviceID           string  `json:"device_id,omitempty"`
		DeviceToken        string  `json:"device_token,omitempty"`
		CollectionInterval string  `json:"collection_interval"`
		JitterPercent      float64 `json:"jitter_percent"`
		MaxRetries         int     `json:"max_retries"`
		BackoffMultiplier  float64 `json:"backoff_multiplier"`
		MaxBackoffTime     string  `json:"max_backoff_time"`
		DataDir            string  `json:"data_dir"`
		SnapshotPath       string  `json:"snapshot_path"`
		LogLevel           string  `json:"log_level"`
		LogDir             string  `json:"log_dir"`
		RequestTimeout     string  `json:"request_timeout"`
		HeartbeatInterval  string  `json:"heartbeat_interval"`
		CommandPollInterval string `json:"command_poll_interval"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Copy non-duration fields
	if temp.APIEndpoint != "" {
		cfg.APIEndpoint = temp.APIEndpoint
	}
	if temp.DeviceID != "" {
		cfg.DeviceID = temp.DeviceID
	}
	if temp.DeviceToken != "" {
		cfg.DeviceToken = temp.DeviceToken
	}
	if temp.JitterPercent > 0 {
		cfg.JitterPercent = temp.JitterPercent
	}
	if temp.MaxRetries > 0 {
		cfg.MaxRetries = temp.MaxRetries
	}
	if temp.BackoffMultiplier > 0 {
		cfg.BackoffMultiplier = temp.BackoffMultiplier
	}
	if temp.DataDir != "" {
		cfg.DataDir = temp.DataDir
	}
	if temp.SnapshotPath != "" {
		cfg.SnapshotPath = temp.SnapshotPath
	}
	if temp.LogLevel != "" {
		cfg.LogLevel = temp.LogLevel
	}
	if temp.LogDir != "" {
		cfg.LogDir = temp.LogDir
	}

	// Parse duration fields
	if temp.CollectionInterval != "" {
		if d, err := time.ParseDuration(temp.CollectionInterval); err == nil {
			cfg.CollectionInterval = d
		}
	}
	if temp.MaxBackoffTime != "" {
		if d, err := time.ParseDuration(temp.MaxBackoffTime); err == nil {
			cfg.MaxBackoffTime = d
		}
	}
	if temp.RequestTimeout != "" {
		if d, err := time.ParseDuration(temp.RequestTimeout); err == nil {
			cfg.RequestTimeout = d
		}
	}
	if temp.HeartbeatInterval != "" {
		if d, err := time.ParseDuration(temp.HeartbeatInterval); err == nil {
			cfg.HeartbeatInterval = d
		}
	}
	if temp.CommandPollInterval != "" {
		if d, err := time.ParseDuration(temp.CommandPollInterval); err == nil {
			cfg.CommandPollInterval = d
		}
	}

	return nil
}

func loadFromEnv(cfg *Config) {
	if endpoint := os.Getenv("TRACR_API_ENDPOINT"); endpoint != "" {
		cfg.APIEndpoint = endpoint
	}
	if token := os.Getenv("TRACR_DEVICE_TOKEN"); token != "" {
		cfg.DeviceToken = token
	}
	if level := os.Getenv("TRACR_LOG_LEVEL"); level != "" {
		cfg.LogLevel = level
	}
}

func createDirectories(cfg *Config) error {
	dirs := []string{
		cfg.DataDir,
		cfg.SnapshotPath,
		cfg.LogDir,
		filepath.Dir(getConfigPath()),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return nil
}