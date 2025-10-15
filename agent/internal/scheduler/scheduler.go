package scheduler

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/tracr/agent/internal/collectors"
	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/client"
	"github.com/tracr/agent/internal/logger"
	"github.com/tracr/agent/internal/storage"
	"github.com/tracr/agent/pkg/version"
)

type Scheduler struct {
	config           *config.Config
	collectorManager *collectors.CollectorManager
	storage          *storage.Storage
	client           *client.Client
	ticker           *time.Ticker
	done             chan struct{}
}

func New(cfg *config.Config) *Scheduler {
	collectorManager := collectors.NewCollectorManager(version.GetVersion())
	storage := storage.New(cfg.DataDir)
	client := client.New(cfg)

	return &Scheduler{
		config:           cfg,
		collectorManager: collectorManager,
		storage:          storage,
		client:           client,
		done:             make(chan struct{}),
	}
}

func (s *Scheduler) Start(ctx context.Context) error {
	// Initialize storage
	if err := s.storage.Init(); err != nil {
		return fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Attempt device registration
	if err := s.ensureRegistered(); err != nil {
		logger.Error("Failed to register device, will retry during collection", "error", err)
	}

	logger.Info("Scheduler starting", "interval", s.config.CollectionInterval)

	// Run initial collection immediately
	go s.runCollection()

	// Start periodic collection with jitter
	jitteredInterval := s.calculateJitteredInterval()
	s.ticker = time.NewTicker(jitteredInterval)

	go s.run(ctx)

	return nil
}

func (s *Scheduler) Stop() {
	logger.Info("Scheduler stopping")
	
	if s.ticker != nil {
		s.ticker.Stop()
	}
	
	close(s.done)
}

func (s *Scheduler) run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.done:
			return
		case <-s.ticker.C:
			s.runCollection()
			
			// Recalculate jitter for next interval
			jitteredInterval := s.calculateJitteredInterval()
			s.ticker.Reset(jitteredInterval)
		}
	}
}

func (s *Scheduler) runCollection() {
	logger.Info("Starting inventory collection")
	
	start := time.Now()

	// Ensure device is registered before collecting data
	if s.config.DeviceID == "" || s.config.DeviceToken == "" {
		logger.Info("Device not registered, attempting registration...", "device_id", s.config.DeviceID, "has_token", s.config.DeviceToken != "")
		if err := s.ensureRegistered(); err != nil {
			logger.Error("Registration failed, will retry next cycle", "error", err)
			return
		}
		logger.Info("Registration successful, proceeding with collection")
	}
	
	// Collect inventory data
	snapshot, err := s.collectorManager.CollectAll()
	if err != nil {
		logger.Error("Failed to collect inventory", "error", err)
		return
	}

	// Save snapshot locally
	snapshotPath, err := s.storage.SaveSnapshot(snapshot)
	if err != nil {
		logger.Error("Failed to save snapshot locally", "error", err)
		// Continue to try sending to API even if local save fails
	} else {
		logger.Debug("Snapshot saved locally", "path", snapshotPath)
	}

	// Send to API if device is registered and online
	if s.config.DeviceID != "" && s.config.DeviceToken != "" {
		if err := s.client.SendInventory(s.config.DeviceID, snapshot); err != nil {
			logger.Error("Failed to send inventory to API", "error", err)
		} else {
			logger.Info("Inventory sent successfully to API")
			
			// Update last sync time
			if err := s.storage.UpdateLastSyncTime(); err != nil {
				logger.Error("Failed to update last sync time", "error", err)
			}
		}
	} else {
		logger.Debug("Device not registered, skipping API send")
	}

	duration := time.Since(start)
	logger.Info("Collection completed", "duration", duration, 
		"hostname", snapshot.Identity.Hostname,
		"volumes", len(snapshot.Volumes),
		"software", len(snapshot.Software))
}

func (s *Scheduler) calculateJitteredInterval() time.Duration {
	baseInterval := s.config.CollectionInterval
	jitterPercent := s.config.JitterPercent
	
	if jitterPercent <= 0 {
		return baseInterval
	}

	// Calculate jitter amount (±jitterPercent of base interval)
	maxJitter := time.Duration(float64(baseInterval) * jitterPercent)
	
	// Generate random jitter between -maxJitter and +maxJitter
	jitter := time.Duration(rand.Int63n(int64(2*maxJitter))) - maxJitter
	
	jitteredInterval := baseInterval + jitter
	
	// Ensure minimum interval of 1 minute
	minInterval := time.Minute
	if jitteredInterval < minInterval {
		jitteredInterval = minInterval
	}

	logger.Debug("Calculated jittered interval", 
		"base", baseInterval,
		"jitter", jitter,
		"final", jitteredInterval)

	return jitteredInterval
}

// ensureRegistered handles device registration with the API backend
func (s *Scheduler) ensureRegistered() error {
	// Check if already registered
	if s.config.DeviceID != "" && s.config.DeviceToken != "" {
		logger.Info("Device already registered", "device_id", s.config.DeviceID)
		return nil
	}

	logger.Info("Device not registered, registering with API...")

	// Collect identity information
	identity, err := s.collectorManager.CollectIdentity()
	if err != nil {
		return fmt.Errorf("failed to collect identity information: %w", err)
	}

	// Collect OS information
	os, err := s.collectorManager.CollectOS()
	if err != nil {
		return fmt.Errorf("failed to collect OS information: %w", err)
	}

	// Prepare registration data
	hostname := identity.Hostname
	osVersion := fmt.Sprintf("%s %s", os.Caption, os.Version)
	agentVersion := version.GetVersion()

	// Call registration API
	resp, err := s.client.Register(hostname, osVersion, agentVersion)
	if err != nil {
		return fmt.Errorf("registration API call failed: %w", err)
	}

	// Save credentials to config
	s.config.DeviceID = resp.DeviceID
	s.config.DeviceToken = resp.DeviceToken

	logger.Info("Saving device credentials to config", "device_id", resp.DeviceID, "config_path", "C:\\ProgramData\\TracrAgent\\config.json")
	if err := s.config.Save(); err != nil {
		logger.Error("CRITICAL: Failed to save device credentials to config", "error", err, "device_id", resp.DeviceID)
		return fmt.Errorf("failed to save device credentials to config: %w", err)
	}
	logger.Info("Device credentials saved successfully", "device_id", resp.DeviceID)

	logger.Info("Registration successful", "device_id", resp.DeviceID, "hostname", hostname)
	return nil
}

// ForceCheckIn triggers immediate data collection without changing device credentials
func (s *Scheduler) ForceCheckIn() error {
	s.logger.Info("Force check-in requested from system tray")
	
	// Trigger immediate collection cycle
	s.TriggerCollection()
	return nil
}

// GetRegistrationStatus returns the current device registration status
func (s *Scheduler) GetRegistrationStatus() (registered bool, deviceID string, lastSeen time.Time) {
	// Check registration status
	registered = s.config.DeviceID != "" && s.config.DeviceToken != ""
	deviceID = s.config.DeviceID

	// Get last sync time from storage
	lastSeen = s.storage.GetLastSyncTime()

	return registered, deviceID, lastSeen
}

// TriggerCollection forces an immediate collection run
// This is used by the command executor for on-demand refreshes
func (s *Scheduler) TriggerCollection() {
	logger.Info("Triggered immediate collection")
	go s.runCollection()
}