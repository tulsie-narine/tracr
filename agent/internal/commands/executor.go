package commands

import (
	"context"
	"fmt"
	"time"

	"github.com/tracr/agent/internal/client"
	"github.com/tracr/agent/internal/collectors"
	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/logger"
)

type Executor struct {
	config           *config.Config
	client           *client.Client
	collectorManager *collectors.CollectorManager
	ticker           *time.Ticker
	done             chan struct{}
	triggerChan      chan struct{} // For external triggers (e.g., from scheduler)
}

func NewExecutor(cfg *config.Config, client *client.Client, collectorManager *collectors.CollectorManager) *Executor {
	return &Executor{
		config:           cfg,
		client:           client,
		collectorManager: collectorManager,
		done:             make(chan struct{}),
		triggerChan:      make(chan struct{}, 1),
	}
}

func (e *Executor) Start(ctx context.Context) error {
	if e.config.DeviceID == "" || e.config.DeviceToken == "" {
		logger.Debug("Device not registered, command executor not starting")
		return nil
	}

	logger.Info("Command executor starting", "poll_interval", e.config.CommandPollInterval)
	
	e.ticker = time.NewTicker(e.config.CommandPollInterval)
	
	go e.run(ctx)
	
	return nil
}

func (e *Executor) Stop() {
	logger.Info("Command executor stopping")
	
	if e.ticker != nil {
		e.ticker.Stop()
	}
	
	close(e.done)
}

func (e *Executor) run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-e.done:
			return
		case <-e.ticker.C:
			e.pollAndExecuteCommands()
		case <-e.triggerChan:
			e.pollAndExecuteCommands()
		}
	}
}

func (e *Executor) TriggerPoll() {
	select {
	case e.triggerChan <- struct{}{}:
	default:
		// Channel is full, poll is already queued
	}
}

func (e *Executor) pollAndExecuteCommands() {
	logger.Debug("Polling for commands")
	
	commands, err := e.client.PollCommands(e.config.DeviceID)
	if err != nil {
		logger.Error("Failed to poll commands", "error", err)
		return
	}

	if len(commands) == 0 {
		logger.Debug("No pending commands")
		return
	}

	logger.Info("Received commands", "count", len(commands))

	for _, command := range commands {
		e.executeCommand(command)
	}
}

func (e *Executor) executeCommand(command client.Command) {
	logger.Info("Executing command", "id", command.ID, "type", command.CommandType)
	
	start := time.Now()
	result := client.CommandResult{
		Success: false,
	}

	switch command.CommandType {
	case "refresh_now":
		result = e.executeRefreshNow()
	default:
		result.Error = fmt.Sprintf("unknown command type: %s", command.CommandType)
		logger.Error("Unknown command type", "type", command.CommandType, "id", command.ID)
	}

	duration := time.Since(start)
	logger.Info("Command execution completed", 
		"id", command.ID, 
		"type", command.CommandType,
		"success", result.Success,
		"duration", duration)

	// Send acknowledgment
	if err := e.client.AckCommand(e.config.DeviceID, command.ID, result); err != nil {
		logger.Error("Failed to acknowledge command", "id", command.ID, "error", err)
	} else {
		logger.Debug("Command acknowledged", "id", command.ID)
	}
}

func (e *Executor) executeRefreshNow() client.CommandResult {
	logger.Info("Executing refresh_now command")

	// Collect fresh inventory data
	snapshot, err := e.collectorManager.CollectAll()
	if err != nil {
		return client.CommandResult{
			Success: false,
			Error:   fmt.Sprintf("failed to collect inventory: %v", err),
		}
	}

	// Send inventory to API
	if err := e.client.SendInventory(e.config.DeviceID, snapshot); err != nil {
		return client.CommandResult{
			Success: false,
			Error:   fmt.Sprintf("failed to send inventory: %v", err),
		}
	}

	return client.CommandResult{
		Success: true,
		Message: fmt.Sprintf("Inventory refreshed successfully. Collected %d volumes, %d software items", 
			len(snapshot.Volumes), len(snapshot.Software)),
	}
}