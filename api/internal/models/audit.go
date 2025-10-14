package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents an audit log entry in the database
type AuditLog struct {
	ID        uuid.UUID        `json:"id" db:"id"`
	UserID    *uuid.UUID       `json:"user_id" db:"user_id"`
	DeviceID  *uuid.UUID       `json:"device_id" db:"device_id"`
	Action    string           `json:"action" db:"action" validate:"required,max=100"`
	Details   json.RawMessage  `json:"details" db:"details"`
	Timestamp time.Time        `json:"timestamp" db:"timestamp"`
	IPAddress string           `json:"ip_address" db:"ip_address"`
	UserAgent string           `json:"user_agent" db:"user_agent"`
}

// AuditLogListItem represents an audit log entry in list views with joined data
type AuditLogListItem struct {
	AuditLog
	Username *string `json:"username,omitempty"`
	Hostname *string `json:"hostname,omitempty"`
}