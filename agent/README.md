# Tracr Agent

The Tracr Agent is a Windows service that collects system inventory data and reports it to the Tracr API. It runs as a Windows service and performs periodic collection of hardware, software, performance, and configuration data.

## Architecture

The agent is built with a modular architecture consisting of several key components:

### Core Components

- **Collectors**: Gather data from various Windows APIs (WMI, Registry)
- **Scheduler**: Manages periodic collection intervals with jitter
- **Client**: Handles HTTP communication with the API
- **Storage**: Local persistence for snapshots and configuration
- **Commands**: Processes server-initiated commands (refresh, etc.)
- **Logger**: Structured logging to file and Windows Event Log

### Data Collection

The agent collects the following types of inventory data:

- **Identity**: Hostname, domain, last user, boot time
- **Operating System**: Edition, version, build number, install date
- **Hardware**: Manufacturer, model, serial number
- **Performance**: CPU usage, memory utilization
- **Storage**: Disk volumes with usage statistics
- **Software**: Installed applications from Windows registry

## Build Instructions

### Prerequisites

- Go 1.21 or later
- Windows SDK (for Windows-specific APIs)
- Git (for version information)

### Building

```bash
# Build for Windows
make build

# Build with specific version
make build VERSION=1.0.0

# Cross-compile from macOS/Linux
GOOS=windows GOARCH=amd64 make build
```

### Testing

```bash
# Run unit tests
make test

# Run tests with coverage
make test-coverage

# Run linter
make lint
```

## Installation

### Manual Installation

1. Build the agent binary
2. Copy to `C:\Program Files\TracrAgent\`
3. Install as Windows service:

```cmd
agent.exe -install
```

4. Configure the agent (see Configuration section)
5. Start the service:

```cmd
agent.exe -start
```

### MSI Installation

For production deployments, use the MSI installer:

```bash
# Build MSI (requires WiX Toolset)
make msi
```

Then deploy the MSI using your preferred method:
- Group Policy
- SCCM/ConfigMgr
- Manual installation
- Scripted deployment

## Service Management

```cmd
# Install service
agent.exe -install

# Uninstall service
agent.exe -uninstall

# Start service
agent.exe -start

# Stop service
agent.exe -stop

# Show version
agent.exe -version
```

## Configuration

The agent uses a JSON configuration file located at:
`C:\ProgramData\TracrAgent\config.json`

### Default Configuration

```json
{
  "api_endpoint": "https://your-api-server:8443",
  "collection_interval": "15m",
  "jitter_percent": 0.1,
  "max_retries": 5,
  "backoff_multiplier": 2.0,
  "max_backoff_time": "5m",
  "log_level": "INFO",
  "request_timeout": "30s",
  "heartbeat_interval": "5m",
  "command_poll_interval": "60s"
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `api_endpoint` | URL of the Tracr API server | Required |
| `collection_interval` | How often to collect inventory | 15m |
| `jitter_percent` | Random variance in collection timing | 0.1 (±10%) |
| `max_retries` | Maximum HTTP request retries | 5 |
| `backoff_multiplier` | Exponential backoff multiplier | 2.0 |
| `log_level` | Logging verbosity (DEBUG/INFO/WARN/ERROR) | INFO |
| `request_timeout` | HTTP request timeout | 30s |
| `heartbeat_interval` | Heartbeat frequency | 5m |
| `command_poll_interval` | Command polling frequency | 60s |

### Environment Variable Overrides

Sensitive configuration can be overridden with environment variables:

- `TRACR_API_ENDPOINT`: API server URL
- `TRACR_DEVICE_TOKEN`: Device authentication token
- `TRACR_LOG_LEVEL`: Logging level

## Logging

The agent logs to multiple destinations:

### File Logging
- **Location**: `C:\ProgramData\TracrAgent\logs\agent.log`
- **Format**: Structured text with timestamps
- **Rotation**: 10MB files, keeps 5 historical files
- **Levels**: DEBUG, INFO, WARN, ERROR

### Windows Event Log
- **Source**: TracrAgent
- **Events**: Critical errors and service lifecycle events
- **Levels**: Information, Warning, Error

### Log Levels

- **DEBUG**: Detailed execution information
- **INFO**: Normal operation events
- **WARN**: Non-critical issues
- **ERROR**: Errors requiring attention

## Development Setup

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd tracr/agent

# Install dependencies
make deps

# Run in console mode for testing
make run-console

# Install as development service
make install-dev

# View logs in real-time
tail -f C:\ProgramData\TracrAgent\logs\agent.log
```

### Testing on Non-Windows Systems

The agent can be built and partially tested on macOS/Linux:

```bash
# Build (cross-compile)
make build

# Run unit tests (mocked components)
make test
```

Note: WMI and Windows Registry collectors will not function outside Windows.

## Troubleshooting

### Common Issues

#### Service Won't Start
- Check Windows Event Log for startup errors
- Verify configuration file is valid JSON
- Ensure API endpoint is reachable
- Check file permissions on data directory

#### No Data Being Collected
- Verify service is running: `sc query TracrAgent`
- Check agent logs for collection errors
- Test WMI queries manually
- Verify network connectivity to API

#### High Resource Usage
- Check collection interval (avoid too frequent)
- Monitor for WMI query timeouts
- Review log level (DEBUG can be verbose)

### Diagnostic Commands

```cmd
# Check service status
sc query TracrAgent

# View service configuration
sc qc TracrAgent

# Check recent Windows Event Log entries
wevtutil qe System /q:"*[System[Provider[@Name='TracrAgent']]]" /c:10 /rd:true /f:text

# Test network connectivity
curl -k https://your-api-server:8443/health

# Validate configuration file
type C:\ProgramData\TracrAgent\config.json | jq .
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```json
{
  "log_level": "DEBUG"
}
```

Or set environment variable:
```cmd
set TRACR_LOG_LEVEL=DEBUG
```

## Security Considerations

- Agent runs as Local System account
- Device tokens are stored in configuration file (secure with file ACLs)
- All API communication uses TLS 1.2+
- Local data is stored in protected ProgramData directory
- Registry access is read-only for software inventory

## Performance

### Resource Usage
- **Memory**: ~10-20MB typical, ~50MB during collection
- **CPU**: <1% average, brief spikes during collection
- **Disk**: Minimal (log rotation, local snapshots)
- **Network**: Periodic API calls, varies with inventory size

### Scaling Considerations
- Collection interval should be tuned based on server capacity
- Use jitter to prevent thundering herd effects
- Monitor API response times and adjust timeouts accordingly

## Integration

### API Registration
On first run, the agent registers with the API server and receives a device token. This token is stored locally and used for subsequent authentication.

### Command Processing
The agent polls the API server for commands every 60 seconds. Supported commands:
- `refresh_now`: Trigger immediate inventory collection

### Data Format
Inventory data is submitted as JSON matching the API schema. See the API documentation for complete payload specifications.