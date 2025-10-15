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

## Running Modes

The Tracr Agent uses a unified `agent.exe` binary that supports different execution modes:

### 1. Windows Service Mode (Production)

**Use for:** Production deployments, automatic startup, unattended operation

- **Runs as:** SYSTEM account
- **Starts:** Automatically on boot
- **User interaction:** Not required
- **Installation:** `agent.exe -install`
- **Logs:** Windows Event Log + file logging

```cmd
# Install and start service
agent.exe -install
agent.exe -start

# Service runs automatically on system startup
```

### 2. System Tray Mode (Testing/Troubleshooting)

**Use for:** Testing registration, troubleshooting connectivity, visual feedback

- **Runs as:** Current user
- **Starts:** Manually when needed
- **User interaction:** System tray icon with menu
- **Installation:** Not required (portable)
- **Logs:** File logging + visual status updates

```cmd
# Run with tray icon (unified binary)
agent.exe -tray
```

**System Tray Features:**
- **Status Display:** Shows registration status (✓ Registered / ✗ Not Registered)
- **Device ID:** Shows first 8 characters of device identifier
- **Last Check-in:** Shows time since last successful API communication
- **Force Check-In:** Triggers immediate data collection and sends fresh snapshot to server
- **Open Logs:** Quick access to log directory in Explorer
- **Open Config:** Opens configuration file in Notepad
- **Quit:** Stops agent and exits

### 3. Interactive Mode (Default)

**Use for:** Development, debugging, visual feedback by default

- **Runs as:** Current user
- **Starts:** Manually from command prompt
- **User interaction:** System tray icon (shown automatically)
- **Installation:** Not required
- **Logs:** File logging + visual status updates

```cmd
# Run with tray by default (better UX)
agent.exe

# Shows system tray automatically for visual feedback
```

**When to Use Each Mode:**

| Scenario | Recommended Mode | Reason |
|----------|------------------|---------|
| Production deployment | Service Mode | Automatic startup, runs as SYSTEM |
| Initial testing | System Tray Mode | Visual feedback, easy troubleshooting |
| Registration troubleshooting | System Tray Mode | Real-time status, manual controls |
| Development | Console Mode | Detailed logging, immediate feedback |
| Connectivity testing | System Tray Mode | Visual confirmation, manual retry |
| Long-term monitoring | Service Mode | Unattended operation, automatic restart |

## Configuration

The agent uses a JSON configuration file located at:
`C:\ProgramData\TracrAgent\config.json`

### Default Configuration

```json
**Location**: `C:\ProgramData\TracrAgent\config.json`

Example configuration:
```json
{
  "api_endpoint": "https://web-production-c4a4.up.railway.app",
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

**Railway URL (Current Production)**: `https://web-production-c4a4.up.railway.app`  
**Generic Example**: `https://api.tracr.example.com`

After editing, restart the Tracr Agent service:
```powershell
Restart-Service TracrAgent
```

#### Method 2: Environment Variable

Set the `TRACR_API_ENDPOINT` environment variable to override the config file:

```powershell
# Railway API (Current Production)
[System.Environment]::SetEnvironmentVariable("TRACR_API_ENDPOINT", "https://web-production-c4a4.up.railway.app", "Machine")

# Generic example
[System.Environment]::SetEnvironmentVariable("TRACR_API_ENDPOINT", "https://api.tracr.example.com", "Machine")

# Restart service to apply changes
Restart-Service TracrAgent
```
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

## Railway Deployment (Current Production Setup)

The production API is deployed on Railway at: `https://web-production-c4a4.up.railway.app`

### Quick Railway Configuration

Use the PowerShell deployment script for automated configuration:

```powershell
# Run from agent directory (as Administrator)
.\deploy-to-railway.ps1

# Verify connectivity
.\verify-railway-connection.ps1
```

**What the script does:**
- Updates config file with Railway API URL (current production URL)
- Preserves existing configuration settings
- Restarts agent service to apply changes
- Provides verification steps

### Manual Railway Configuration

Create/edit config file: `C:\ProgramData\TracrAgent\config.json`

```json
{
  "api_endpoint": "https://web-production-c4a4.up.railway.app",
  "collection_interval": "15m",
  "log_level": "INFO",
  "heartbeat_interval": "5m"
}
```

Then restart the service: `Restart-Service TracrAgent`

### Railway Verification Steps

1. **Test connectivity**: Run `verify-railway-connection.ps1`
2. **Check agent logs**: Look for registration success messages
3. **Verify in web frontend**: Check device appears at https://tracr-silk.vercel.app
4. **Login credentials**: `admin` / `admin123`

**Complete Railway Guide**: [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md)

## Device Registration

The Tracr Agent automatically registers with the API backend on first startup. This section explains the registration process and troubleshooting steps.

### Automatic Registration

When the agent starts for the first time or with empty device credentials:

1. **Registration happens during service startup**
2. **Device credentials are saved to config file**
3. **Subsequent runs use saved credentials**
4. **Registration is automatically retried if it fails**

### Registration Process

The agent collects minimal identity information and registers with the API:

1. **Collect hostname and OS version** from the local system
2. **Send registration request** to `POST /v1/agents/register`
3. **API returns device_id and device_token**
4. **Credentials are saved** to `C:\ProgramData\TracrAgent\config.json`
5. **Agent can now send inventory data**

### Verification

To verify successful registration:

1. **Check config file** for device_id and device_token fields:
   ```json
   {
     "device_id": "abc123def456",
     "device_token": "xyz789..."
   }
   ```

2. **Check logs** for "Registration successful" message:
   ```
   2025-10-15 12:34:56 [INFO] Registration successful | device_id=abc123def456 hostname=DESKTOP-ABC123
   ```

3. **Verify in web dashboard**:
   - Go to https://tracr-silk.vercel.app
   - Login with admin / admin123
   - Device should appear in Devices page
   - Status should show "Online" within 5 minutes

### Device ID Persistence

**Device ID is assigned once during initial registration:**
- The same device ID is used for all subsequent communications
- Force Check-In preserves the device ID and only sends fresh data
- To get a new device ID, delete the config file and restart the agent

**Force Check-In Behavior:**
- Triggers immediate data collection and sends current system state to server
- Does NOT re-register the device or change the device ID
- Preserves existing device credentials for stable identification

### Manual Re-registration

To force the agent to register as a new device:

1. **Stop the service**: `Stop-Service TracrAgent`
2. **Delete config file**: `Remove-Item C:\ProgramData\TracrAgent\config.json`
3. **Start the service**: `Start-Service TracrAgent`
4. **Agent will register as new device**

### Troubleshooting Registration Issues

#### "Device not registered" in logs

**Cause**: Registration failed due to network or API issues

**Solutions**:
- Check network connectivity to Railway API
- Verify API URL in config: `https://web-production-c4a4.up.railway.app`
- Check firewall rules allow outbound HTTPS
- Review agent logs for detailed error messages

#### "Registration failed" errors

**Cause**: API endpoint not accessible or returning errors

**Solutions**:
- Test API connectivity: `curl https://web-production-c4a4.up.railway.app`
- Verify SSL certificate is valid
- Check Railway deployment status
- Check API logs for server-side errors
- Retry registration: restart service

#### Device appears but shows "Offline"

**Cause**: Registration succeeded but heartbeat failing

**Solutions**:
- Registration succeeded but data transmission failing
- Check device_token in config file is not empty
- Verify token authentication is working
- Check API logs for authentication errors
- Check agent logs for "Inventory sent successfully" messages

### System Tray Integration

The system tray provides a user-friendly interface for monitoring and controlling the Tracr Agent:

#### Running with System Tray

```cmd
# Using unified binary (recommended)
agent.exe -tray

# Or run without flags (shows tray by default)
agent.exe

# Using deployment script
run-with-tray.bat
```

#### Tray Menu Items

**Status Information (Updated every 5 seconds):**
- **Status**: Shows "✓ Registered" or "✗ Not Registered"
- **Device ID**: Shows first 8 characters of device identifier (e.g., "abc123de...")
- **Last Check-in**: Shows time since last successful API communication (e.g., "2 minutes ago")

**Interactive Controls:**
- **Force Check-In**: Triggers immediate data collection and sends fresh snapshot to server (preserves existing device ID - does not create a new device)
- **Open Logs**: Opens log directory (`C:\ProgramData\TracrAgent\logs`) in Windows Explorer
- **Open Config**: Opens configuration file in Notepad for editing
- **Quit**: Stops the agent and exits the tray application

#### Use Cases for System Tray Mode

**Testing Registration:**
1. Run `agent.exe -tray`
2. Wait 30 seconds for registration
3. Check tray menu shows "✓ Registered"
4. Verify device appears in web dashboard

**Troubleshooting Connectivity:**
1. Right-click tray icon
2. Select "Force Check-In"
3. Watch status update in real-time
4. Use "Open Logs" to view detailed error messages

**Verifying Configuration:**
1. Use "Open Config" to edit settings
2. Save file and restart agent
3. Monitor registration status
4. Check "Last Check-in" time updates

**Benefits:**
- **Visual Feedback**: No need to check log files manually
- **Manual Control**: Force data collection without restarting service
- **Quick Access**: Direct links to logs and configuration
- **Real-time Updates**: Status refreshes every 5 seconds
- **No Installation**: Runs without installing as Windows service

#### Troubleshooting: Multiple Devices Appearing

**Symptoms:**
- Multiple devices appear in dashboard for the same machine
- Device ID changes after using "Force Check-In" from system tray
- New device created on each agent restart

**Root Causes:**

1. **Config file being deleted:**
   - Check if config file exists: `C:\ProgramData\TracrAgent\config.json`
   - If file is missing, agent will re-register as new device
   - Solution: Don't delete config file unless intentionally re-registering

2. **Config file not saving properly:**
   - Check file permissions on `C:\ProgramData\TracrAgent\` directory
   - Verify service account has write access
   - Check logs for "Failed to save device credentials" errors
   - Solution: Fix directory permissions, run as Administrator

3. **Hostname changing:**
   - Backend creates new device if hostname doesn't match existing device
   - Check if machine hostname is stable
   - Solution: Ensure hostname doesn't change, or manually merge devices in dashboard

**Cleanup:**
- If multiple devices exist for same machine:
  - Identify the correct device (most recent activity)
  - Note the device_id from config file
  - Delete duplicate devices from web dashboard
  - Keep only the device matching the config file's device_id

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