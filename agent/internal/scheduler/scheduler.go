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

// TriggerCollection forces an immediate collection run
// This is used by the command executor for on-demand refreshes
func (s *Scheduler) TriggerCollection() {
	logger.Info("Triggered immediate collection")
	go s.runCollection()
}