package collectors

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"golang.org/x/sys/windows/registry"
)

type SoftwareCollector struct{}

type registryEntry struct {
	DisplayName     string
	DisplayVersion  string
	Publisher       string
	InstallDate     string
	EstimatedSize   uint64
}

func NewSoftwareCollector() *SoftwareCollector {
	return &SoftwareCollector{}
}

func (c *SoftwareCollector) Collect() (interface{}, error) {
	var software []Software

	// Registry paths for installed software
	registryPaths := []string{
		`Software\Microsoft\Windows\CurrentVersion\Uninstall`,
		`Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`, // 32-bit apps on 64-bit Windows
	}

	for _, regPath := range registryPaths {
		entries, err := c.readRegistryPath(regPath)
		if err != nil {
			// Continue with other paths even if one fails
			continue
		}
		software = append(software, entries...)
	}

	return software, nil
}

func (c *SoftwareCollector) readRegistryPath(path string) ([]Software, error) {
	var software []Software

	// Open the registry key
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.ENUMERATE_SUB_KEYS)
	if err != nil {
		return nil, fmt.Errorf("failed to open registry key %s: %w", path, err)
	}
	defer key.Close()

	// Enumerate subkeys
	subkeys, err := key.ReadSubKeyNames(-1)
	if err != nil {
		return nil, fmt.Errorf("failed to read subkeys: %w", err)
	}

	for _, subkey := range subkeys {
		entry, err := c.readSoftwareEntry(key, subkey)
		if err != nil {
			// Skip entries that can't be read
			continue
		}

		// Skip entries without a display name
		if entry.DisplayName == "" {
			continue
		}

		// Skip Windows system components and updates
		if c.isSystemComponent(entry.DisplayName) {
			continue
		}

		softwareItem := Software{
			Name:      entry.DisplayName,
			Version:   entry.DisplayVersion,
			Publisher: entry.Publisher,
			SizeKB:    entry.EstimatedSize,
		}

		// Parse install date
		if entry.InstallDate != "" {
			if installDate, err := c.parseInstallDate(entry.InstallDate); err == nil {
				softwareItem.InstallDate = installDate
			}
		}

		software = append(software, softwareItem)
	}

	return software, nil
}

func (c *SoftwareCollector) readSoftwareEntry(parentKey registry.Key, subkeyName string) (*registryEntry, error) {
	subkey, err := registry.OpenKey(parentKey, subkeyName, registry.QUERY_VALUE)
	if err != nil {
		return nil, err
	}
	defer subkey.Close()

	entry := &registryEntry{}

	// Read DisplayName
	if name, _, err := subkey.GetStringValue("DisplayName"); err == nil {
		entry.DisplayName = name
	}

	// Read DisplayVersion
	if version, _, err := subkey.GetStringValue("DisplayVersion"); err == nil {
		entry.DisplayVersion = version
	}

	// Read Publisher
	if publisher, _, err := subkey.GetStringValue("Publisher"); err == nil {
		entry.Publisher = publisher
	}

	// Read InstallDate
	if installDate, _, err := subkey.GetStringValue("InstallDate"); err == nil {
		entry.InstallDate = installDate
	}

	// Read EstimatedSize (in KB)
	if size, _, err := subkey.GetIntegerValue("EstimatedSize"); err == nil {
		entry.EstimatedSize = size
	}

	return entry, nil
}

func (c *SoftwareCollector) parseInstallDate(dateStr string) (time.Time, error) {
	// InstallDate is typically in YYYYMMDD format
	if len(dateStr) != 8 {
		return time.Time{}, fmt.Errorf("invalid date format: %s", dateStr)
	}

	year, err := strconv.Atoi(dateStr[:4])
	if err != nil {
		return time.Time{}, err
	}

	month, err := strconv.Atoi(dateStr[4:6])
	if err != nil {
		return time.Time{}, err
	}

	day, err := strconv.Atoi(dateStr[6:8])
	if err != nil {
		return time.Time{}, err
	}

	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC), nil
}

func (c *SoftwareCollector) isSystemComponent(name string) bool {
	// Filter out Windows system components and updates
	systemKeywords := []string{
		"Microsoft Visual C++",
		"Microsoft .NET Framework",
		"Security Update for Microsoft",
		"Update for Microsoft",
		"Hotfix for Microsoft",
		"Microsoft Windows",
		"Windows Internet Explorer",
		"Internet Explorer",
		"Microsoft Silverlight",
		"Microsoft Office",
		"Microsoft SQL Server",
		"Windows Software Development Kit",
		"Windows Driver Package",
		"Microsoft Application Error Reporting",
		"Microsoft Search Enhancement Pack",
		"Windows Live",
		"Microsoft XNA Framework",
		"Microsoft Games for Windows",
		"KB", // Knowledge Base updates
	}

	nameLower := strings.ToLower(name)
	for _, keyword := range systemKeywords {
		if strings.Contains(nameLower, strings.ToLower(keyword)) {
			return true
		}
	}

	return false
}