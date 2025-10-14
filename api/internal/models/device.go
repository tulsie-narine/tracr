package models

import (
	"time"

	"github.com/google/uuid"
)

type DeviceStatus string

const (
	DeviceStatusActive   DeviceStatus = "active"
	DeviceStatusInactive DeviceStatus = "inactive"
	DeviceStatusOffline  DeviceStatus = "offline"
	DeviceStatusError    DeviceStatus = "error"
)

type Device struct {
	ID               uuid.UUID    `json:"id" db:"id"`
	Hostname         string       `json:"hostname" db:"hostname" validate:"required,min=1,max=255"`
	Domain           string       `json:"domain" db:"domain"`
	Manufacturer     string       `json:"manufacturer" db:"manufacturer"`
	Model            string       `json:"model" db:"model"`
	SerialNumber     string       `json:"serial_number" db:"serial_number"`
	OSCaption        string       `json:"os_caption" db:"os_caption"`
	OSVersion        string       `json:"os_version" db:"os_version"`
	OSBuild          string       `json:"os_build" db:"os_build"`
	FirstSeen        time.Time    `json:"first_seen" db:"first_seen"`
	LastSeen         time.Time    `json:"last_seen" db:"last_seen"`
	DeviceTokenHash  string       `json:"-" db:"device_token_hash"` // Never expose token hash
	TokenCreatedAt   time.Time    `json:"token_created_at" db:"token_created_at"`
	Status           DeviceStatus `json:"status" db:"status"`
	CreatedAt        time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time    `json:"updated_at" db:"updated_at"`
}

// DeviceListItem represents a device in list views (with computed fields)
type DeviceListItem struct {
	Device
	LatestSnapshot *SnapshotSummary `json:"latest_snapshot,omitempty"`
	IsOnline       bool             `json:"is_online"`
	UptimeHours    int              `json:"uptime_hours,omitempty"`
}

// DeviceRegistration represents the payload for device registration
type DeviceRegistration struct {
	Hostname     string `json:"hostname" validate:"required,min=1,max=255"`
	OSVersion    string `json:"os_version" validate:"required,max=100"`
	AgentVersion string `json:"agent_version" validate:"required,max=100"`
}

// DeviceRegistrationResponse represents the response after successful registration
type DeviceRegistrationResponse struct {
	DeviceID    uuid.UUID `json:"device_id"`
	DeviceToken string    `json:"device_token"`
}