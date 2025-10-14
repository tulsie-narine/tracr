package collectors

import (
	"fmt"

	"github.com/StackExchange/wmi"
)

type HardwareCollector struct{}

type win32ComputerSystemHW struct {
	Manufacturer string
	Model        string
}

type win32BIOS struct {
	SerialNumber string
}

func NewHardwareCollector() *HardwareCollector {
	return &HardwareCollector{}
}

func (c *HardwareCollector) Collect() (interface{}, error) {
	hardware := Hardware{}

	// Get manufacturer and model from Win32_ComputerSystem
	var computerSystems []win32ComputerSystemHW
	if err := wmi.Query("SELECT Manufacturer, Model FROM Win32_ComputerSystem", &computerSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_ComputerSystem: %w", err)
	}

	if len(computerSystems) > 0 {
		cs := computerSystems[0]
		hardware.Manufacturer = cs.Manufacturer
		hardware.Model = cs.Model
	}

	// Get serial number from Win32_BIOS
	var biosSystems []win32BIOS
	if err := wmi.Query("SELECT SerialNumber FROM Win32_BIOS", &biosSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_BIOS: %w", err)
	}

	if len(biosSystems) > 0 {
		hardware.SerialNumber = biosSystems[0].SerialNumber
		
		// Handle common cases where serial number is not useful
		if hardware.SerialNumber == "To Be Filled By O.E.M." || 
		   hardware.SerialNumber == "System Serial Number" ||
		   hardware.SerialNumber == "Default string" ||
		   hardware.SerialNumber == "" {
			hardware.SerialNumber = ""
		}
	}

	return hardware, nil
}