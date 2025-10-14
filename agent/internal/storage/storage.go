package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Storage struct {
	dataDir      string
	snapshotDir  string
	mu           sync.RWMutex
	deviceID     string
	lastSyncTime time.Time
}

type DeviceInfo struct {
	ID           string    `json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	LastSyncTime time.Time `json:"last_sync_time"`
}

func New(dataDir string) *Storage {
	snapshotDir := filepath.Join(dataDir, "snapshots")
	return &Storage{
		dataDir:     dataDir,
		snapshotDir: snapshotDir,
	}
}

func (s *Storage) Init() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Create directories
	dirs := []string{s.dataDir, s.snapshotDir}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	// Load or generate device ID
	if err := s.loadDeviceInfo(); err != nil {
		return fmt.Errorf("failed to load device info: %w", err)
	}

	return nil
}

func (s *Storage) GetDeviceID() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.deviceID
}

func (s *Storage) GetLastSyncTime() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.lastSyncTime
}

func (s *Storage) UpdateLastSyncTime() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastSyncTime = time.Now()
	return s.saveDeviceInfo()
}

func (s *Storage) SaveSnapshot(data interface{}) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	timestamp := time.Now()
	filename := fmt.Sprintf("snapshot_%s.json", timestamp.Format("20060102_150405"))
	filePath := filepath.Join(s.snapshotDir, filename)

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal snapshot data: %w", err)
	}

	if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
		return "", fmt.Errorf("failed to write snapshot file: %w", err)
	}

	// Clean up old snapshots (keep last 10)
	if err := s.cleanupOldSnapshots(); err != nil {
		// Log warning but don't fail
		// TODO: Add proper logging here
	}

	return filePath, nil
}

func (s *Storage) LoadLatestSnapshot() ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entries, err := os.ReadDir(s.snapshotDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read snapshot directory: %w", err)
	}

	var latestFile string
	var latestTime time.Time

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().After(latestTime) {
			latestTime = info.ModTime()
			latestFile = entry.Name()
		}
	}

	if latestFile == "" {
		return nil, fmt.Errorf("no snapshots found")
	}

	filePath := filepath.Join(s.snapshotDir, latestFile)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read snapshot file: %w", err)
	}

	return data, nil
}

func (s *Storage) loadDeviceInfo() error {
	deviceInfoPath := filepath.Join(s.dataDir, "device.json")

	data, err := os.ReadFile(deviceInfoPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Generate new device ID
			return s.generateNewDevice()
		}
		return fmt.Errorf("failed to read device info: %w", err)
	}

	var info DeviceInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return fmt.Errorf("failed to unmarshal device info: %w", err)
	}

	s.deviceID = info.ID
	s.lastSyncTime = info.LastSyncTime

	return nil
}

func (s *Storage) saveDeviceInfo() error {
	info := DeviceInfo{
		ID:           s.deviceID,
		CreatedAt:    time.Now(),
		LastSyncTime: s.lastSyncTime,
	}

	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal device info: %w", err)
	}

	deviceInfoPath := filepath.Join(s.dataDir, "device.json")
	if err := os.WriteFile(deviceInfoPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write device info: %w", err)
	}

	return nil
}

func (s *Storage) generateNewDevice() error {
	s.deviceID = uuid.New().String()
	s.lastSyncTime = time.Time{}

	return s.saveDeviceInfo()
}

func (s *Storage) cleanupOldSnapshots() error {
	entries, err := os.ReadDir(s.snapshotDir)
	if err != nil {
		return err
	}

	// Filter JSON files and sort by modification time
	var snapshots []os.DirEntry
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			snapshots = append(snapshots, entry)
		}
	}

	if len(snapshots) <= 10 {
		return nil
	}

	// Sort by modification time (newest first)
	type fileWithTime struct {
		entry os.DirEntry
		time  time.Time
	}

	var filesWithTime []fileWithTime
	for _, entry := range snapshots {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		filesWithTime = append(filesWithTime, fileWithTime{
			entry: entry,
			time:  info.ModTime(),
		})
	}

	// Sort by time (newest first)
	for i := 0; i < len(filesWithTime)-1; i++ {
		for j := i + 1; j < len(filesWithTime); j++ {
			if filesWithTime[i].time.Before(filesWithTime[j].time) {
				filesWithTime[i], filesWithTime[j] = filesWithTime[j], filesWithTime[i]
			}
		}
	}

	// Delete old files (keep first 10)
	for i := 10; i < len(filesWithTime); i++ {
		filePath := filepath.Join(s.snapshotDir, filesWithTime[i].entry.Name())
		if err := os.Remove(filePath); err != nil {
			// Continue with other files even if one fails
			continue
		}
	}

	return nil
}