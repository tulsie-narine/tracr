package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type CommandStatus string

const (
	CommandStatusQueued     CommandStatus = "queued"
	CommandStatusInProgress CommandStatus = "in_progress"
	CommandStatusCompleted  CommandStatus = "completed"
	CommandStatusFailed     CommandStatus = "failed"
	CommandStatusExpired    CommandStatus = "expired"
)

type CommandType string

const (
	CommandTypeRefreshNow CommandType = "refresh_now"
)

type Command struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	DeviceID    uuid.UUID       `json:"device_id" db:"device_id"`
	CommandType CommandType     `json:"command_type" db:"command_type" validate:"required"`
	Payload     json.RawMessage `json:"payload" db:"payload"`
	Status      CommandStatus   `json:"status" db:"status"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	ExecutedAt  *time.Time      `json:"executed_at" db:"executed_at"`
	Result      json.RawMessage `json:"result" db:"result"`
}

// CommandRequest represents a request to create a new command
type CommandRequest struct {
	CommandType CommandType     `json:"command_type" validate:"required"`
	Payload     json.RawMessage `json:"payload"`
}

// CommandResult represents the result of command execution
type CommandResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// RefreshNowPayload represents the payload for refresh_now commands
type RefreshNowPayload struct {
	Force bool `json:"force,omitempty"`
}