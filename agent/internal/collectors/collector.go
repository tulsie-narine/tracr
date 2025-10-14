package collectors

import (
	"time"
)

// Collector defines the interface for all data collectors
type Collector interface {
	Collect() (interface{}, error)
}

// InventorySnapshot represents the complete system inventory
type InventorySnapshot struct {
	Identity    Identity       `json:"identity"`
	OS          OS             `json:"os"`
	Hardware    Hardware       `json:"hardware"`
	Performance Performance    `json:"performance"`
	Volumes     []Volume       `json:"volumes"`
	Software    []Software     `json:"software"`
	CollectedAt time.Time      `json:"collected_at"`
	AgentVersion string        `json:"agent_version"`
}

// Identity represents system identity information
type Identity struct {
	Hostname            string    `json:"hostname"`
	Domain              string    `json:"domain"`
	LastInteractiveUser string    `json:"last_interactive_user"`
	BootTime           time.Time `json:"boot_time"`
}

// OS represents operating system information
type OS struct {
	Caption     string    `json:"caption"`
	Version     string    `json:"version"`
	BuildNumber string    `json:"build_number"`
	InstallDate time.Time `json:"install_date"`
}

// Hardware represents hardware information
type Hardware struct {
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	SerialNumber string `json:"serial_number"`
}

// Performance represents current performance metrics
type Performance struct {
	CPUPercent      float64 `json:"cpu_percent"`
	MemoryUsedBytes uint64  `json:"memory_used_bytes"`
	MemoryTotalBytes uint64 `json:"memory_total_bytes"`
}

// Volume represents disk volume information
type Volume struct {
	Name       string `json:"name"`
	FileSystem string `json:"filesystem"`
	TotalBytes uint64 `json:"total_bytes"`
	FreeBytes  uint64 `json:"free_bytes"`
	UsedBytes  uint64 `json:"used_bytes"`
}

// Software represents installed software information
type Software struct {
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Publisher   string    `json:"publisher"`
	InstallDate time.Time `json:"install_date"`
	SizeKB      uint64    `json:"size_kb"`
}

// CollectorManager orchestrates all collectors to build complete inventory
type CollectorManager struct {
	identityCollector    Collector
	osCollector         Collector
	hardwareCollector   Collector
	performanceCollector Collector
	volumesCollector    Collector
	softwareCollector   Collector
	agentVersion        string
}

// NewCollectorManager creates a new collector manager with all collectors
func NewCollectorManager(agentVersion string) *CollectorManager {
	return &CollectorManager{
		identityCollector:    NewIdentityCollector(),
		osCollector:         NewOSCollector(),
		hardwareCollector:   NewHardwareCollector(),
		performanceCollector: NewPerformanceCollector(),
		volumesCollector:    NewVolumesCollector(),
		softwareCollector:   NewSoftwareCollector(),
		agentVersion:        agentVersion,
	}
}

// CollectAll gathers data from all collectors and builds complete snapshot
func (cm *CollectorManager) CollectAll() (*InventorySnapshot, error) {
	snapshot := &InventorySnapshot{
		CollectedAt:  time.Now(),
		AgentVersion: cm.agentVersion,
	}

	// Collect identity information
	identityData, err := cm.identityCollector.Collect()
	if err != nil {
		return nil, err
	}
	if identity, ok := identityData.(Identity); ok {
		snapshot.Identity = identity
	}

	// Collect OS information
	osData, err := cm.osCollector.Collect()
	if err != nil {
		return nil, err
	}
	if os, ok := osData.(OS); ok {
		snapshot.OS = os
	}

	// Collect hardware information
	hardwareData, err := cm.hardwareCollector.Collect()
	if err != nil {
		return nil, err
	}
	if hardware, ok := hardwareData.(Hardware); ok {
		snapshot.Hardware = hardware
	}

	// Collect performance information
	performanceData, err := cm.performanceCollector.Collect()
	if err != nil {
		return nil, err
	}
	if performance, ok := performanceData.(Performance); ok {
		snapshot.Performance = performance
	}

	// Collect volumes information
	volumesData, err := cm.volumesCollector.Collect()
	if err != nil {
		return nil, err
	}
	if volumes, ok := volumesData.([]Volume); ok {
		snapshot.Volumes = volumes
	}

	// Collect software information
	softwareData, err := cm.softwareCollector.Collect()
	if err != nil {
		return nil, err
	}
	if software, ok := softwareData.([]Software); ok {
		snapshot.Software = software
	}

	return snapshot, nil
}