package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/tracr/agent/cmd"
	"github.com/tracr/agent/internal/logger"
	"github.com/tracr/agent/pkg/version"
	"golang.org/x/sys/windows/svc"
)

const serviceName = "TracrAgent"

func main() {
	var (
		versionFlag = flag.Bool("version", false, "show version information")
		installFlag = flag.Bool("install", false, "install the service")
		uninstallFlag = flag.Bool("uninstall", false, "uninstall the service")
		startFlag   = flag.Bool("start", false, "start the service")
		stopFlag    = flag.Bool("stop", false, "stop the service")
	)
	flag.Parse()

	if *versionFlag {
		fmt.Println(version.GetVersion())
		return
	}

	// Initialize logging
	logger.Init()

	// Check if running as Windows service
	isWindowsService, err := svc.IsWindowsService()
	if err != nil {
		log.Fatalf("Failed to determine if running as service: %v", err)
	}

	if isWindowsService {
		// Running as Windows service
		if err := cmd.RunService(serviceName); err != nil {
			log.Fatalf("Service failed: %v", err)
		}
		return
	}

	// Running interactively - handle command line arguments
	switch {
	case *installFlag:
		if err := cmd.InstallService(serviceName); err != nil {
			log.Fatalf("Failed to install service: %v", err)
		}
		fmt.Println("Service installed successfully")
	case *uninstallFlag:
		if err := cmd.UninstallService(serviceName); err != nil {
			log.Fatalf("Failed to uninstall service: %v", err)
		}
		fmt.Println("Service uninstalled successfully")
	case *startFlag:
		if err := cmd.StartService(serviceName); err != nil {
			log.Fatalf("Failed to start service: %v", err)
		}
		fmt.Println("Service started successfully")
	case *stopFlag:
		if err := cmd.StopService(serviceName); err != nil {
			log.Fatalf("Failed to stop service: %v", err)
		}
		fmt.Println("Service stopped successfully")
	default:
		// Run in console mode for development/testing
		fmt.Println("Running in console mode. Use -install to install as service.")
		if err := cmd.RunConsole(); err != nil {
			log.Fatalf("Console mode failed: %v", err)
		}
	}
}