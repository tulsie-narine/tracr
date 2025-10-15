package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	"github.com/tracr/agent/cmd"
	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/logger"
	"github.com/tracr/agent/internal/scheduler"
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
		trayFlag    = flag.Bool("tray", false, "run with system tray icon")
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
	case *trayFlag:
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("Failed to load configuration: %v", err)
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		s := scheduler.New(cfg)
		if err := s.Start(ctx); err != nil {
			log.Fatalf("Failed to start scheduler: %v", err)
		}
		defer s.Stop()

		fmt.Println("Starting Tracr Agent with system tray...")
		fmt.Println("Look for Tracr icon in system tray (bottom-right corner)")
		cmd.RunWithTray(s)
	default:
		// Run with tray by default for better user experience
		fmt.Println("Starting Tracr Agent with system tray...")
		fmt.Println("Look for Tracr icon in system tray (bottom-right corner)")
		fmt.Println("Use -install to install as Windows service")
		
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("Failed to load configuration: %v", err)
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		s := scheduler.New(cfg)
		if err := s.Start(ctx); err != nil {
			log.Fatalf("Failed to start scheduler: %v", err)
		}
		defer s.Stop()

		cmd.RunWithTray(s)
	}
}