package cmd

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/tracr/agent/internal/config"
	"github.com/tracr/agent/internal/logger"
	"github.com/tracr/agent/internal/scheduler"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

type service struct {
	scheduler *scheduler.Scheduler
	ctx       context.Context
	cancel    context.CancelFunc
}

func (s *service) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}

	// Start the scheduler with retry logic
	s.ctx, s.cancel = context.WithCancel(context.Background())
	
	// Try to load configuration with retries
	var cfg *config.Config
	var err error
	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		cfg, err = config.Load()
		if err == nil {
			break
		}
		logger.Error("Failed to load configuration", "error", err, "attempt", attempt)
		if attempt < maxRetries {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	
	if err != nil {
		logger.Error("Failed to load configuration after retries", "error", err, "attempts", maxRetries)
		changes <- svc.Status{State: svc.Stopped, Win32ExitCode: 1}
		return
	}

	s.scheduler = scheduler.New(cfg)
	if err := s.scheduler.Start(s.ctx); err != nil {
		logger.Error("Failed to start scheduler", "error", err)
		changes <- svc.Status{State: svc.Stopped, Win32ExitCode: 1}
		return
	}

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
	logger.Info("Service started successfully")

	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				logger.Info("Service stop requested")
				s.cancel()
				if s.scheduler != nil {
					s.scheduler.Stop()
				}
				changes <- svc.Status{State: svc.StopPending}
				// Give components time to shut down gracefully
				time.Sleep(2 * time.Second)
				changes <- svc.Status{State: svc.Stopped}
				return
			default:
				logger.Error("Unexpected service control request", "cmd", c.Cmd)
			}
		}
	}
}

func RunService(name string) error {
	return svc.Run(name, &service{})
}

func RunConsole() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load configuration: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s := scheduler.New(cfg)
	if err := s.Start(ctx); err != nil {
		return fmt.Errorf("failed to start scheduler: %w", err)
	}
	defer s.Stop()

	logger.Info("Running in console mode - press Ctrl+C to stop")
	
	// Wait for interrupt signal
	select {
	case <-ctx.Done():
		return nil
	}
}

func InstallService(name string) error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err == nil {
		s.Close()
		return fmt.Errorf("service %s already exists", name)
	}

	config := mgr.Config{
		StartType:    mgr.StartAutomatic,
		ErrorControl: mgr.ErrorNormal,
		Description:  "Tracr Agent - Windows system inventory collection service",
		DisplayName:  "Tracr Agent",
	}

	s, err = m.CreateService(name, exePath, config)
	if err != nil {
		return fmt.Errorf("failed to create service: %w", err)
	}
	defer s.Close()

	return nil
}

func UninstallService(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %s not found: %w", name, err)
	}
	defer s.Close()

	// Stop the service if it's running
	status, err := s.Query()
	if err == nil && status.State == svc.Running {
		if _, err := s.Control(svc.Stop); err != nil {
			log.Printf("Warning: failed to stop service before uninstall: %v", err)
		}
		// Wait for service to stop
		for i := 0; i < 30; i++ {
			status, err := s.Query()
			if err != nil || status.State == svc.Stopped {
				break
			}
			time.Sleep(time.Second)
		}
	}

	if err := s.Delete(); err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}

	return nil
}

func StartService(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %s not found: %w", name, err)
	}
	defer s.Close()

	if err := s.Start(); err != nil {
		return fmt.Errorf("failed to start service: %w", err)
	}

	return nil
}

func StopService(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %s not found: %w", name, err)
	}
	defer s.Close()

	status, err := s.Control(svc.Stop)
	if err != nil {
		return fmt.Errorf("failed to stop service: %w", err)
	}

	// Wait for service to stop
	for status.State != svc.Stopped {
		time.Sleep(100 * time.Millisecond)
		status, err = s.Query()
		if err != nil {
			return fmt.Errorf("failed to query service status: %w", err)
		}
	}

	return nil
}