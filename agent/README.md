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

## Production Deployment Configuration

After deploying the Tracr API backend to production, configure agents to communicate with the production API URL. For detailed deployment instructions, see the web frontend [DEPLOYMENT.md](../web/DEPLOYMENT.md).

### Configuration Methods

#### Method 1: Configuration File (Recommended)

**Location**: `C:\ProgramData\TracrAgent\config.json`

Edit the configuration file to point to your production API backend:

```json
{
  "api_endpoint": "https://api.tracr.example.com",
  "collection_interval": "15m",
  "heartbeat_interval": "5m",
  "log_level": "INFO",
  "request_timeout": "30s",
  "command_poll_interval": "60s"
}
```

After editing, restart the Tracr Agent service:
```powershell
Restart-Service TracrAgent
```

#### Method 2: Environment Variable

Set the `TRACR_API_ENDPOINT` environment variable to override the config file:

```powershell
# Set system-wide environment variable
[System.Environment]::SetEnvironmentVariable("TRACR_API_ENDPOINT", "https://api.tracr.example.com", "Machine")

# Restart service to apply changes
Restart-Service TracrAgent
```

Environment variables take precedence over config file values.

#### Method 3: Installer Configuration

During agent installation, provide the API endpoint as an MSI parameter:

```cmd
msiexec /i TracrAgent.msi API_ENDPOINT=https://api.tracr.example.com /quiet
```

This method sets the initial configuration file value during installation.

### Agent Registration Process

When the agent starts with a new API endpoint, it follows this registration process:

1. **Agent Startup**: Agent reads configuration and validates API endpoint
2. **Registration Request**: Agent calls `POST /v1/agents/register` with:
   - Hostname (`DESKTOP-ABC123`)
   - OS Version (`Windows 11 Pro`)
   - Agent Version (`1.0.0`)
3. **API Response**: API backend returns:
   - `device_id` (unique identifier)
   - `device_token` (authentication token)
4. **Save Credentials**: Agent saves credentials to config file
5. **Start Operations**: Agent begins heartbeat and inventory collection
6. **Web Frontend**: Device appears in dashboard device list

Registration only happens once per device unless credentials are reset.

### Verification Steps

#### Check Agent Status
```powershell
# Verify service is running
Get-Service TracrAgent

# Check recent logs
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 20
```

#### Look for Successful Registration
Check agent logs for registration success:
```
INFO Agent starting with config: api_endpoint=https://api.tracr.example.com
INFO Attempting agent registration...
INFO Agent registered successfully: device_id=abc123, hostname=DESKTOP-XYZ
INFO Device token saved to config file
INFO Starting heartbeat goroutine (interval: 5m)
INFO Starting command polling goroutine (interval: 60s)
INFO Starting inventory collection (interval: 15m)
```

#### Verify in Web Frontend
1. Login to web dashboard at your deployed URL
2. Navigate to Devices page
3. Verify device appears in list with:
   - Correct hostname
   - "Online" status (green badge)
   - Recent "Last Seen" timestamp
4. Click device to view details:
   - Snapshots tab shows recent inventory data
   - Performance tab shows CPU/memory metrics
   - Software tab shows installed applications

### Troubleshooting Production Issues

#### Agent Not Registering
**Symptoms**: Device doesn't appear in web frontend device list

**Solutions**:
- Verify `api_endpoint` URL is correct and accessible: `curl https://api.tracr.example.com/health`
- Check Windows Firewall allows outbound HTTPS traffic (port 443)
- Verify SSL certificate is valid (agents validate certificates)
- Check agent logs for detailed error messages
- Test network connectivity: `Test-NetConnection api.tracr.example.com -Port 443`

#### Agent Registered But Not Sending Data
**Symptoms**: Device appears offline or no recent snapshots

**Solutions**:
- Verify `device_token` is saved in config file
- Check agent logs for authentication errors
- Verify API backend is accepting requests
- Test API connectivity with saved token
- Check system clock is synchronized (JWT tokens are time-sensitive)

#### Device Shows as "Offline" in Web Frontend
**Symptoms**: Device status shows red "Offline" badge

**Solutions**:
- Agent hasn't sent heartbeat in last 5 minutes
- Check agent service is running: `Get-Service TracrAgent`
- Check agent logs for recent errors
- Verify network connectivity between agent and API backend
- Check system resources (CPU, memory, disk space)

### Mass Deployment Strategies

#### Group Policy (Domain Environment)
```powershell
# Create GPO to deploy MSI with parameters
msiexec /i "\\domain\share\TracrAgent.msi" API_ENDPOINT=https://api.tracr.example.com /quiet
```

#### Microsoft Intune (MDM)
- Upload MSI to Intune console
- Configure installation parameters
- Deploy to device groups
- Monitor deployment status

#### PowerShell DSC (Desired State Configuration)
```powershell
Configuration TracrAgentInstall {
    Node $AllNodes.NodeName {
        Package TracrAgent {
            Ensure = "Present"
            Name = "Tracr Agent"
            Path = "\\share\TracrAgent.msi"
            Arguments = "API_ENDPOINT=https://api.tracr.example.com /quiet"
            ProductId = "{GUID}"
        }
    }
}
```

#### SCCM/ConfigMgr
- Create application package
- Set installation command with API_ENDPOINT parameter
- Deploy to device collections
- Monitor compliance

### Best Practices for Production

1. **Staged Rollout**: Deploy to pilot group before organization-wide
2. **Monitor Registration**: Watch API logs for registration rate
3. **Network Capacity**: Ensure API backend can handle agent load
4. **SSL Certificates**: Use valid certificates (agents reject self-signed)
5. **Time Synchronization**: Ensure accurate system clocks for JWT validation
6. **Firewall Rules**: Allow outbound HTTPS (port 443) to API backend
7. **Service Accounts**: Run agent service with minimal required privileges
8. **Update Strategy**: Plan for agent updates and configuration changes

See [web frontend DEPLOYMENT.md](../web/DEPLOYMENT.md) for comprehensive production deployment documentation.

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