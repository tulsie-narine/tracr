package models

import (
	"time"

	"github.com/google/uuid"
)

// Snapshot represents a complete inventory snapshot
type Snapshot struct {
	ID                   uuid.UUID `json:"id" db:"id"`
	DeviceID             uuid.UUID `json:"device_id" db:"device_id"`
	CollectedAt          time.Time `json:"collected_at" db:"collected_at" validate:"required"`
	AgentVersion         string    `json:"agent_version" db:"agent_version"`
	SnapshotHash         string    `json:"snapshot_hash" db:"snapshot_hash"`
	CPUPercent           *float64  `json:"cpu_percent" db:"cpu_percent" validate:"omitempty,min=0,max=100"`
	MemoryUsedBytes      *int64    `json:"memory_used_bytes" db:"memory_used_bytes" validate:"omitempty,min=0"`
	MemoryTotalBytes     *int64    `json:"memory_total_bytes" db:"memory_total_bytes" validate:"omitempty,min=0"`
	BootTime             *time.Time `json:"boot_time" db:"boot_time"`
	LastInteractiveUser  string    `json:"last_interactive_user" db:"last_interactive_user"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`

	// Related data (loaded separately)
	Identity    *Identity  `json:"identity,omitempty"`
	OS          *OS        `json:"os,omitempty"`
	Hardware    *Hardware  `json:"hardware,omitempty"`
	Performance *Performance `json:"performance,omitempty"`
	Volumes     []Volume   `json:"volumes,omitempty"`
	Software    []Software `json:"software,omitempty"`
}

// SnapshotSummary represents basic snapshot info for listings
type SnapshotSummary struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CollectedAt time.Time `json:"collected_at" db:"collected_at"`
	CPUPercent  *float64  `json:"cpu_percent" db:"cpu_percent"`
	MemoryUsedBytes *int64 `json:"memory_used_bytes" db:"memory_used_bytes"`
	MemoryTotalBytes *int64 `json:"memory_total_bytes" db:"memory_total_bytes"`
}

// InventorySubmission represents the complete payload submitted by agents
type InventorySubmission struct {
	Identity    Identity    `json:"identity" validate:"required"`
	OS          OS          `json:"os" validate:"required"`
	Hardware    Hardware    `json:"hardware" validate:"required"`
	Performance Performance `json:"performance" validate:"required"`
	Volumes     []Volume    `json:"volumes" validate:"dive"`
	Software    []Software  `json:"software" validate:"dive"`
	CollectedAt time.Time   `json:"collected_at" validate:"required"`
	AgentVersion string     `json:"agent_version" validate:"required"`
}

// Identity represents system identity information
type Identity struct {
	Hostname            string    `json:"hostname" validate:"required,min=1,max=255"`
	Domain              string    `json:"domain" validate:"max=255"`
	LastInteractiveUser string    `json:"last_interactive_user" validate:"max=255"`
	BootTime            time.Time `json:"boot_time"`
}

// OS represents operating system information
type OS struct {
	Caption     string    `json:"caption" validate:"required,max=255"`
	Version     string    `json:"version" validate:"required,max=100"`
	BuildNumber string    `json:"build_number" validate:"max=100"`
	InstallDate time.Time `json:"install_date"`
}

// Hardware represents hardware information
type Hardware struct {
	Manufacturer string `json:"manufacturer" validate:"max=255"`
	Model        string `json:"model" validate:"max=255"`
	SerialNumber string `json:"serial_number" validate:"max=255"`
}

// Performance represents current performance metrics
type Performance struct {
	CPUPercent       float64 `json:"cpu_percent" validate:"min=0,max=100"`
	MemoryUsedBytes  int64   `json:"memory_used_bytes" validate:"min=0"`
	MemoryTotalBytes int64   `json:"memory_total_bytes" validate:"min=0"`
}

// Volume represents disk volume information
type Volume struct {
	ID         uuid.UUID `json:"id,omitempty" db:"id"`
	SnapshotID uuid.UUID `json:"snapshot_id,omitempty" db:"snapshot_id"`
	Name       string    `json:"name" db:"name" validate:"required,max=10"`
	FileSystem string    `json:"filesystem" db:"filesystem" validate:"max=50"`
	TotalBytes int64     `json:"total_bytes" db:"total_bytes" validate:"min=0"`
	FreeBytes  int64     `json:"free_bytes" db:"free_bytes" validate:"min=0"`
	CreatedAt  time.Time `json:"created_at,omitempty" db:"created_at"`
	
	// Computed fields
	UsedBytes int64   `json:"used_bytes,omitempty"`
	UsedPercent float64 `json:"used_percent,omitempty"`
}

// Software represents installed software information
type Software struct {
	ID          uuid.UUID  `json:"id,omitempty" db:"id"`
	SnapshotID  uuid.UUID  `json:"snapshot_id,omitempty" db:"snapshot_id"`
	Name        string     `json:"name" db:"name" validate:"required,max=500"`
	Version     string     `json:"version" db:"version" validate:"max=100"`
	Publisher   string     `json:"publisher" db:"publisher" validate:"max=255"`
	InstallDate *time.Time `json:"install_date" db:"install_date"`
	SizeKB      *int64     `json:"size_kb" db:"size_kb" validate:"omitempty,min=0"`
	CreatedAt   time.Time  `json:"created_at,omitempty" db:"created_at"`
}

// SoftwareCatalogItem represents aggregated software across all devices
type SoftwareCatalogItem struct {
	Name        string `json:"name" db:"name"`
	Version     string `json:"version" db:"version"`
	Publisher   string `json:"publisher" db:"publisher"`
	DeviceCount int    `json:"device_count" db:"device_count"`
	LatestSeen  time.Time `json:"latest_seen" db:"latest_seen"`
}