package mocks

import (
	"fmt"
	"time"
)

// MockWMIQuery provides mock WMI query functionality for testing
type MockWMIQuery struct {
	responses map[string]interface{}
}

func NewMockWMIQuery() *MockWMIQuery {
	return &MockWMIQuery{
		responses: make(map[string]interface{}),
	}
}

// SetResponse sets a mock response for a given WMI query
func (m *MockWMIQuery) SetResponse(query string, response interface{}) {
	m.responses[query] = response
}

// Query simulates a WMI query and returns the mock response
func (m *MockWMIQuery) Query(query string, dst interface{}) error {
	response, exists := m.responses[query]
	if !exists {
		return fmt.Errorf("no mock response for query: %s", query)
	}
	
	// In a real mock, we'd use reflection to properly populate dst
	// For now, this is a placeholder that would need proper implementation
	// based on the specific test needs
	
	return nil
}

// GetDefaultMockData returns standard mock data for common WMI queries
func GetDefaultMockData() *MockWMIQuery {
	mock := NewMockWMIQuery()
	
	// Mock Win32_ComputerSystem
	mock.SetResponse(
		"SELECT Name, Domain, Workgroup, UserName FROM Win32_ComputerSystem",
		[]interface{}{
			map[string]interface{}{
				"Name":      "TEST-PC",
				"Domain":    "WORKGROUP",
				"Workgroup": "WORKGROUP",
				"UserName":  "testuser",
			},
		},
	)
	
	// Mock Win32_OperatingSystem
	mock.SetResponse(
		"SELECT Caption, Version, BuildNumber, InstallDate FROM Win32_OperatingSystem",
		[]interface{}{
			map[string]interface{}{
				"Caption":     "Microsoft Windows 11 Pro",
				"Version":     "10.0.22631",
				"BuildNumber": "22631",
				"InstallDate": "20231201120000.000000-300",
			},
		},
	)
	
	// Mock Win32_OperatingSystem for boot time
	mock.SetResponse(
		"SELECT LastBootUpTime FROM Win32_OperatingSystem",
		[]interface{}{
			map[string]interface{}{
				"LastBootUpTime": time.Now().Add(-24 * time.Hour).Format("20060102150405") + ".000000-300",
			},
		},
	)
	
	// Mock Win32_ComputerSystem for hardware
	mock.SetResponse(
		"SELECT Manufacturer, Model FROM Win32_ComputerSystem",
		[]interface{}{
			map[string]interface{}{
				"Manufacturer": "Dell Inc.",
				"Model":        "OptiPlex 7090",
			},
		},
	)
	
	// Mock Win32_BIOS
	mock.SetResponse(
		"SELECT SerialNumber FROM Win32_BIOS",
		[]interface{}{
			map[string]interface{}{
				"SerialNumber": "ABC123456",
			},
		},
	)
	
	// Mock Win32_Processor
	mock.SetResponse(
		"SELECT LoadPercentage FROM Win32_Processor",
		[]interface{}{
			map[string]interface{}{
				"LoadPercentage": uint16(25),
			},
		},
	)
	
	// Mock Win32_OperatingSystem for memory
	mock.SetResponse(
		"SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem",
		[]interface{}{
			map[string]interface{}{
				"TotalVisibleMemorySize": uint64(16777216), // 16GB in KB
				"FreePhysicalMemory":     uint64(8388608),  // 8GB in KB
			},
		},
	)
	
	// Mock Win32_LogicalDisk
	mock.SetResponse(
		"SELECT DeviceID, FileSystem, Size, FreeSpace, DriveType FROM Win32_LogicalDisk WHERE DriveType = 3",
		[]interface{}{
			map[string]interface{}{
				"DeviceID":   "C:",
				"FileSystem": "NTFS",
				"Size":       uint64(1000204886016), // ~1TB
				"FreeSpace":  uint64(500102443008),  // ~500GB
				"DriveType":  uint32(3),
			},
			map[string]interface{}{
				"DeviceID":   "D:",
				"FileSystem": "NTFS", 
				"Size":       uint64(2000409772032), // ~2TB
				"FreeSpace":  uint64(1500307328024), // ~1.5TB
				"DriveType":  uint32(3),
			},
		},
	)
	
	return mock
}