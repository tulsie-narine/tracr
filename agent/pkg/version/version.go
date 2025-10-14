package version

import (
	"fmt"
	"runtime"
)

// These variables are set via ldflags during build
var (
	Version   = "dev"
	BuildDate = "unknown"
	GitCommit = "unknown"
)

// GetVersion returns a formatted version string
func GetVersion() string {
	return fmt.Sprintf("Tracr Agent v%s (build %s, commit %s, %s/%s)", 
		Version, BuildDate, GitCommit, runtime.GOOS, runtime.GOARCH)
}

// GetShortVersion returns just the version number
func GetShortVersion() string {
	return Version
}