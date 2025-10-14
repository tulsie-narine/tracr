package collectors

import (
	"fmt"
	"time"

	"github.com/StackExchange/wmi"
)

type OSCollector struct{}

type win32OperatingSystemOS struct {
	Caption     string
	Version     string
	BuildNumber string
	InstallDate string
}

func NewOSCollector() *OSCollector {
	return &OSCollector{}
}

func (c *OSCollector) Collect() (interface{}, error) {
	osInfo := OS{}

	var osSystems []win32OperatingSystemOS
	query := "SELECT Caption, Version, BuildNumber, InstallDate FROM Win32_OperatingSystem"
	
	if err := wmi.Query(query, &osSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_OperatingSystem: %w", err)
	}

	if len(osSystems) > 0 {
		os := osSystems[0]
		
		osInfo.Caption = os.Caption
		osInfo.Version = os.Version
		osInfo.BuildNumber = os.BuildNumber

		// Parse install date
		if os.InstallDate != "" {
			if installDate, err := c.parseWMITime(os.InstallDate); err == nil {
				osInfo.InstallDate = installDate
			}
		}
	}

	return osInfo, nil
}

func (c *OSCollector) parseWMITime(wmiTime string) (time.Time, error) {
	// WMI time format: YYYYMMDDHHMMSS.ffffff+UUU
	// Example: 20231215143022.500000-300
	
	if len(wmiTime) < 14 {
		return time.Time{}, fmt.Errorf("invalid WMI time format: %s", wmiTime)
	}

	// Extract the basic time part (YYYYMMDDHHMMSS)
	timeStr := wmiTime[:14]
	
	// Parse as "20060102150405" format
	t, err := time.Parse("20060102150405", timeStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse WMI time: %w", err)
	}

	// Convert to UTC for consistency
	return t.UTC(), nil
}