package collectors

import (
	"fmt"

	"github.com/StackExchange/wmi"
)

type PerformanceCollector struct{}

type win32Processor struct {
	LoadPercentage uint16
}

type win32OperatingSystemPerf struct {
	TotalVisibleMemorySize uint64
	FreePhysicalMemory     uint64
}

func NewPerformanceCollector() *PerformanceCollector {
	return &PerformanceCollector{}
}

func (c *PerformanceCollector) Collect() (interface{}, error) {
	performance := Performance{}

	// Get CPU usage
	var processors []win32Processor
	if err := wmi.Query("SELECT LoadPercentage FROM Win32_Processor", &processors); err != nil {
		return nil, fmt.Errorf("failed to query Win32_Processor: %w", err)
	}

	if len(processors) > 0 {
		// Calculate average CPU usage across all processors
		var totalLoad uint32
		var validProcessors uint32
		
		for _, processor := range processors {
			// LoadPercentage can be 0-100, but sometimes it's not available
			if processor.LoadPercentage <= 100 {
				totalLoad += uint32(processor.LoadPercentage)
				validProcessors++
			}
		}
		
		if validProcessors > 0 {
			performance.CPUPercent = float64(totalLoad) / float64(validProcessors)
		}
	}

	// Get memory usage
	var osSystems []win32OperatingSystemPerf
	if err := wmi.Query("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem", &osSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_OperatingSystem for memory: %w", err)
	}

	if len(osSystems) > 0 {
		os := osSystems[0]
		
		// Convert from KB to bytes
		totalMemoryBytes := os.TotalVisibleMemorySize * 1024
		freeMemoryBytes := os.FreePhysicalMemory * 1024
		
		performance.MemoryTotalBytes = totalMemoryBytes
		performance.MemoryUsedBytes = totalMemoryBytes - freeMemoryBytes
	}

	return performance, nil
}