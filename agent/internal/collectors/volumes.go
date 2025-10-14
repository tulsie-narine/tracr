package collectors

import (
	"fmt"

	"github.com/StackExchange/wmi"
)

type VolumesCollector struct{}

type win32LogicalDisk struct {
	DeviceID   string
	FileSystem string
	Size       uint64
	FreeSpace  uint64
	DriveType  uint32
}

func NewVolumesCollector() *VolumesCollector {
	return &VolumesCollector{}
}

func (c *VolumesCollector) Collect() (interface{}, error) {
	var volumes []Volume

	var disks []win32LogicalDisk
	// DriveType = 3 means fixed disk (hard drive)
	// This excludes removable drives (2), network drives (4), CD-ROM (5), etc.
	query := "SELECT DeviceID, FileSystem, Size, FreeSpace, DriveType FROM Win32_LogicalDisk WHERE DriveType = 3"
	
	if err := wmi.Query(query, &disks); err != nil {
		return nil, fmt.Errorf("failed to query Win32_LogicalDisk: %w", err)
	}

	for _, disk := range disks {
		// Skip if size is 0 (can happen with some system volumes)
		if disk.Size == 0 {
			continue
		}

		volume := Volume{
			Name:       disk.DeviceID,
			FileSystem: disk.FileSystem,
			TotalBytes: disk.Size,
			FreeBytes:  disk.FreeSpace,
			UsedBytes:  disk.Size - disk.FreeSpace,
		}

		volumes = append(volumes, volume)
	}

	return volumes, nil
}