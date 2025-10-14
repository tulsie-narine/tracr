package test

import (
	"context"
	"testing"
	"time"

	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/scheduler"
)

func TestScheduler(t *testing.T) {
	t.Run("JitterCalculation", func(t *testing.T) {
		cfg := &config.Config{
			CollectionInterval: 15 * time.Minute,
			JitterPercent:     0.1,
		}
		
		s := scheduler.New(cfg)
		
		// Test multiple jitter calculations to ensure they're within bounds
		for i := 0; i < 100; i++ {
			// This would require exposing the calculateJitteredInterval method
			// or creating a testable version
			
			// Expected jitter should be ±10% of 15 minutes = ±1.5 minutes
			// So final interval should be between 13.5 and 16.5 minutes
		}
	})
	
	t.Run("ImmediateExecution", func(t *testing.T) {
		cfg := &config.Config{
			CollectionInterval: time.Hour, // Long interval to avoid timer firing
			DataDir:           t.TempDir(),
		}
		
		s := scheduler.New(cfg)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		
		// Start scheduler
		err := s.Start(ctx)
		if err != nil {
			t.Fatalf("Failed to start scheduler: %v", err)
		}
		defer s.Stop()
		
		// Scheduler should run collection immediately on start
		// This test would need to mock the collection process
		// and verify it was called shortly after Start()
	})
	
	t.Run("GracefulShutdown", func(t *testing.T) {
		cfg := &config.Config{
			CollectionInterval: time.Minute,
			DataDir:           t.TempDir(),
		}
		
		s := scheduler.New(cfg)
		ctx, cancel := context.WithCancel(context.Background())
		
		// Start scheduler
		err := s.Start(ctx)
		if err != nil {
			t.Fatalf("Failed to start scheduler: %v", err)
		}
		
		// Stop after short delay
		time.Sleep(100 * time.Millisecond)
		s.Stop()
		cancel()
		
		// Verify scheduler stopped gracefully
		// This test would need to monitor the scheduler's internal state
	})
	
	t.Run("TriggerCollection", func(t *testing.T) {
		cfg := &config.Config{
			CollectionInterval: time.Hour, // Long interval
			DataDir:           t.TempDir(),
		}
		
		s := scheduler.New(cfg)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		
		err := s.Start(ctx)
		if err != nil {
			t.Fatalf("Failed to start scheduler: %v", err)
		}
		defer s.Stop()
		
		// Trigger manual collection
		s.TriggerCollection()
		
		// Verify that collection was triggered
		// This would need monitoring of the collection process
	})
}

// Mock time functions for deterministic testing
func TestSchedulerWithMockTime(t *testing.T) {
	// In a real implementation, you would:
	// 1. Create a time interface that can be mocked
	// 2. Inject it into the scheduler
	// 3. Control time progression in tests
	// 4. Verify exact timing of collections without waiting
	
	t.Skip("Mock time implementation needed for deterministic testing")
}