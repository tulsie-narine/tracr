package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/sys/windows/svc/eventlog"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var (
	levelNames = map[Level]string{
		DEBUG: "DEBUG",
		INFO:  "INFO",
		WARN:  "WARN",
		ERROR: "ERROR",
	}
	
	currentLevel = INFO
	fileLogger   *log.Logger
	eventLogger  *eventlog.Log
	logFile      *os.File
	mutex        sync.Mutex
)

func Init() {
	initFileLogger()
	initEventLogger()
}

func initFileLogger() {
	logDir := `C:\ProgramData\TracrAgent\logs`
	
	// Create log directory
	if err := os.MkdirAll(logDir, 0755); err != nil {
		fmt.Printf("Failed to create log directory: %v\n", err)
		return
	}

	// Open log file
	logPath := filepath.Join(logDir, "agent.log")
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		fmt.Printf("Failed to open log file: %v\n", err)
		return
	}

	logFile = file
	fileLogger = log.New(file, "", 0) // We'll handle our own formatting
}

func initEventLogger() {
	// Try to create/open Windows Event Log
	elog, err := eventlog.Open("TracrAgent")
	if err != nil {
		// Try to install event source if it doesn't exist
		if err := eventlog.InstallAsEventCreate("TracrAgent", eventlog.Error|eventlog.Warning|eventlog.Info); err != nil {
			fmt.Printf("Failed to install event log source: %v\n", err)
			return
		}
		
		// Try to open again after installation
		elog, err = eventlog.Open("TracrAgent")
		if err != nil {
			fmt.Printf("Failed to open event log: %v\n", err)
			return
		}
	}
	
	eventLogger = elog
}

func SetLevel(level string) {
	levelUpper := strings.ToUpper(level)
	switch levelUpper {
	case "DEBUG":
		currentLevel = DEBUG
	case "INFO":
		currentLevel = INFO
	case "WARN":
		currentLevel = WARN
	case "ERROR":
		currentLevel = ERROR
	default:
		currentLevel = INFO
	}
}

func Close() {
	mutex.Lock()
	defer mutex.Unlock()
	
	if logFile != nil {
		logFile.Close()
	}
	
	if eventLogger != nil {
		eventLogger.Close()
	}
}

func Debug(msg string, args ...interface{}) {
	logMessage(DEBUG, msg, args...)
}

func Info(msg string, args ...interface{}) {
	logMessage(INFO, msg, args...)
}

func Warn(msg string, args ...interface{}) {
	logMessage(WARN, msg, args...)
}

func Error(msg string, args ...interface{}) {
	logMessage(ERROR, msg, args...)
}

func logMessage(level Level, msg string, args ...interface{}) {
	if level < currentLevel {
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	levelName := levelNames[level]
	
	// Build structured message
	var formattedMsg string
	if len(args) > 0 {
		// Handle key-value pairs
		var pairs []string
		for i := 0; i < len(args)-1; i += 2 {
			if i+1 < len(args) {
				key := fmt.Sprintf("%v", args[i])
				value := fmt.Sprintf("%v", args[i+1])
				pairs = append(pairs, fmt.Sprintf("%s=%s", key, value))
			}
		}
		
		if len(pairs) > 0 {
			formattedMsg = fmt.Sprintf("%s | %s", msg, strings.Join(pairs, " "))
		} else {
			formattedMsg = msg
		}
	} else {
		formattedMsg = msg
	}

	// Log to file
	if fileLogger != nil {
		logLine := fmt.Sprintf("%s [%s] %s", timestamp, levelName, formattedMsg)
		fileLogger.Println(logLine)
		
		// Rotate log if needed
		rotateLogIfNeeded()
	}

	// Log critical events to Windows Event Log
	if eventLogger != nil && level >= WARN {
		var eventType uint16
		switch level {
		case WARN:
			eventType = eventlog.Warning
		case ERROR:
			eventType = eventlog.Error
		default:
			eventType = eventlog.Info
		}
		
		eventLogger.Report(eventType, 0, formattedMsg)
	}

	// Also log to console in debug mode
	if currentLevel <= DEBUG {
		fmt.Printf("%s [%s] %s\n", timestamp, levelName, formattedMsg)
	}
}

func rotateLogIfNeeded() {
	if logFile == nil {
		return
	}

	// Get current file size
	info, err := logFile.Stat()
	if err != nil {
		return
	}

	maxSize := int64(10 * 1024 * 1024) // 10MB
	if info.Size() < maxSize {
		return
	}

	// Close current file
	logFile.Close()

	// Rotate existing files
	logDir := `C:\ProgramData\TracrAgent\logs`
	baseName := "agent.log"
	maxFiles := 5

	// Move existing rotated files
	for i := maxFiles - 1; i >= 1; i-- {
		oldPath := filepath.Join(logDir, fmt.Sprintf("%s.%d", baseName, i))
		newPath := filepath.Join(logDir, fmt.Sprintf("%s.%d", baseName, i+1))
		
		if _, err := os.Stat(oldPath); err == nil {
			os.Rename(oldPath, newPath)
		}
	}

	// Move current file to .1
	currentPath := filepath.Join(logDir, baseName)
	rotatedPath := filepath.Join(logDir, fmt.Sprintf("%s.1", baseName))
	os.Rename(currentPath, rotatedPath)

	// Create new log file
	file, err := os.OpenFile(currentPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return
	}

	logFile = file
	fileLogger = log.New(file, "", 0)
}