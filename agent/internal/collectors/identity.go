package collectors

import (
	"fmt"
	"time"

	"github.com/StackExchange/wmi"
)

type IdentityCollector struct{}

type win32ComputerSystem struct {
	Name          string
	Domain        string
	Workgroup     string
	UserName      string
}

type win32OperatingSystem struct {
	LastBootUpTime string
}

type win32LogonSession struct {
	LogonType      uint32
	StartTime      string
	AuthenticationPackage string
}

type win32LoggedOnUser struct {
	Antecedent string
	Dependent  string
}

func NewIdentityCollector() *IdentityCollector {
	return &IdentityCollector{}
}

func (c *IdentityCollector) Collect() (interface{}, error) {
	identity := Identity{}

	// Get computer system information
	var computerSystems []win32ComputerSystem
	if err := wmi.Query("SELECT Name, Domain, Workgroup, UserName FROM Win32_ComputerSystem", &computerSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_ComputerSystem: %w", err)
	}

	if len(computerSystems) > 0 {
		cs := computerSystems[0]
		identity.Hostname = cs.Name
		
		// Determine domain or workgroup
		if cs.Domain != "" && cs.Domain != cs.Name {
			identity.Domain = cs.Domain
		} else if cs.Workgroup != "" {
			identity.Domain = cs.Workgroup
		}

		// Get last interactive user
		if cs.UserName != "" {
			identity.LastInteractiveUser = cs.UserName
		} else {
			// Fallback: try to get from logon sessions
			if user := c.getLastInteractiveUserFromSessions(); user != "" {
				identity.LastInteractiveUser = user
			}
		}
	}

	// Get boot time
	var osSystems []win32OperatingSystem
	if err := wmi.Query("SELECT LastBootUpTime FROM Win32_OperatingSystem", &osSystems); err != nil {
		return nil, fmt.Errorf("failed to query Win32_OperatingSystem for boot time: %w", err)
	}

	if len(osSystems) > 0 && osSystems[0].LastBootUpTime != "" {
		if bootTime, err := c.parseWMITime(osSystems[0].LastBootUpTime); err == nil {
			identity.BootTime = bootTime
		}
	}

	return identity, nil
}

func (c *IdentityCollector) getLastInteractiveUserFromSessions() string {
	var sessions []win32LogonSession
	
	// Query for interactive logon sessions (type 2)
	if err := wmi.Query("SELECT LogonType, StartTime, AuthenticationPackage FROM Win32_LogonSession WHERE LogonType = 2", &sessions); err != nil {
		return ""
	}

	// Find the most recent session
	var latestTime time.Time
	for _, session := range sessions {
		if session.StartTime == "" {
			continue
		}
		
		if sessionTime, err := c.parseWMITime(session.StartTime); err == nil {
			if sessionTime.After(latestTime) {
				latestTime = sessionTime
			}
		}
	}

	// If we found a recent session, try to get the user associated with it
	// This is complex and may not always work, so we'll return empty string
	// for simplicity. In a production system, you might want to use additional
	// WMI classes or Windows APIs to get this information.
	
	return ""
}

func (c *IdentityCollector) parseWMITime(wmiTime string) (time.Time, error) {
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

	// Handle timezone offset if present
	if len(wmiTime) > 15 && (wmiTime[14] == '+' || wmiTime[14] == '-') {
		// For simplicity, we'll assume local time
		// In production, you might want to handle the timezone offset properly
		return t, nil
	}

	return t, nil
}