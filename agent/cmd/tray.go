package cmd

import (
	"fmt"
	"os/exec"
	"time"

	"github.com/getlantern/systray"
	
	"github.com/tracr/agent/internal/scheduler"
	"github.com/tracr/agent/internal/logger"
)

// Icon data will be embedded if icon.ico exists
// If file doesn't exist, iconData will be empty and default icon will be used
var iconData []byte

// Global variables for system tray
var (
	globalScheduler   *scheduler.Scheduler
	statusItem        *systray.MenuItem
	deviceIDItem      *systray.MenuItem
	lastSeenItem      *systray.MenuItem
	forceCheckInItem  *systray.MenuItem
)

// RunWithTray starts the agent with system tray UI
func RunWithTray(sched *scheduler.Scheduler) {
	globalScheduler = sched
	logger.Info("Starting system tray interface")
	systray.Run(onReady, onExit)
}

// onReady is called when the system tray is ready
func onReady() {
	// Set tray icon and title
	if len(iconData) > 0 {
		systray.SetIcon(iconData)
	}
	systray.SetTitle("Tracr Agent")
	systray.SetTooltip("Tracr Device Monitoring Agent")

	// Create menu structure
	statusItem = systray.AddMenuItem("Status: Checking...", "Device registration status")
	statusItem.Disable()

	deviceIDItem = systray.AddMenuItem("Device ID: Unknown", "Device identifier")
	deviceIDItem.Disable()

	lastSeenItem = systray.AddMenuItem("Last Check-in: Never", "Last successful API communication")
	lastSeenItem.Disable()

	systray.AddSeparator()

	forceCheckInItem = systray.AddMenuItem("Force Check-In", "Trigger immediate registration and data collection")

	systray.AddSeparator()

	openLogsItem := systray.AddMenuItem("Open Logs", "Open log directory in Explorer")
	openConfigItem := systray.AddMenuItem("Open Config", "Open configuration file in Notepad")

	systray.AddSeparator()

	quitItem := systray.AddMenuItem("Quit", "Stop agent and exit")

	// Start status update loop
	go updateStatusLoop()

	// Handle menu clicks
	go func() {
		for {
			select {
			case <-forceCheckInItem.ClickedCh:
				go handleForceCheckIn()
			case <-openLogsItem.ClickedCh:
				go handleOpenLogs()
			case <-openConfigItem.ClickedCh:
				go handleOpenConfig()
			case <-quitItem.ClickedCh:
				logger.Info("Quit requested from system tray")
				systray.Quit()
				return
			}
		}
	}()
}

// updateStatusLoop updates the tray menu status every 5 seconds
func updateStatusLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if globalScheduler == nil {
				continue
			}

			registered, deviceID, lastSeen := globalScheduler.GetRegistrationStatus()

			if registered {
				statusItem.SetTitle("Status: ✓ Registered")
				
				// Show first 8 characters of device ID
				if len(deviceID) > 8 {
					deviceIDItem.SetTitle(fmt.Sprintf("Device ID: %s...", deviceID[:8]))
				} else {
					deviceIDItem.SetTitle(fmt.Sprintf("Device ID: %s", deviceID))
				}

				// Format last seen time
				if !lastSeen.IsZero() {
					duration := time.Since(lastSeen)
					lastSeenItem.SetTitle(fmt.Sprintf("Last Check-in: %s ago", formatDuration(duration)))
				} else {
					lastSeenItem.SetTitle("Last Check-in: Never")
				}
			} else {
				statusItem.SetTitle("Status: ✗ Not Registered")
				deviceIDItem.SetTitle("Device ID: Not assigned")
				lastSeenItem.SetTitle("Last Check-in: Never")
			}
		}
	}
}

// handleForceCheckIn processes force check-in requests
func handleForceCheckIn() {
	if globalScheduler == nil {
		logger.Error("Force check-in failed: scheduler not initialized")
		return
	}

	logger.Info("Force check-in triggered from system tray")
	
	// Update menu to show progress
	forceCheckInItem.SetTitle("Checking in...")
	forceCheckInItem.Disable()
	
	// Perform force registration
	err := globalScheduler.ForceRegistration()
	
	// Re-enable menu item
	forceCheckInItem.SetTitle("Force Check-In")
	forceCheckInItem.Enable()
	
	if err != nil {
		logger.Error("Force registration failed", "error", err)
		// TODO: Show error notification using github.com/gen2brain/beeep
		return
	}

	logger.Info("Force registration successful")
	
	// Trigger immediate data collection
	globalScheduler.TriggerCollection()
	
	// TODO: Show success notification using github.com/gen2brain/beeep
}

// handleOpenLogs opens the log directory in Windows Explorer
func handleOpenLogs() {
	logDir := "C:\\ProgramData\\TracrAgent\\logs"
	err := exec.Command("explorer", logDir).Start()
	if err != nil {
		logger.Error("Failed to open log directory", "error", err, "path", logDir)
	} else {
		logger.Info("Opened log directory", "path", logDir)
	}
}

// handleOpenConfig opens the configuration file in Notepad
func handleOpenConfig() {
	configFile := "C:\\ProgramData\\TracrAgent\\config.json"
	err := exec.Command("notepad", configFile).Start()
	if err != nil {
		logger.Error("Failed to open config file", "error", err, "path", configFile)
	} else {
		logger.Info("Opened config file", "path", configFile)
	}
}

// formatDuration formats a duration in human-readable format
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%.0f seconds", d.Seconds())
	} else if d < time.Hour {
		return fmt.Sprintf("%.0f minutes", d.Minutes())
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%.0f hours", d.Hours())
	} else {
		days := int(d.Hours() / 24)
		return fmt.Sprintf("%d days", days)
	}
}

// getIcon returns the embedded icon data
func getIcon() []byte {
	return iconData
}

// onExit is called when the system tray is closing
func onExit() {
	logger.Info("System tray exiting")
	if globalScheduler != nil {
		globalScheduler.Stop()
	}
}