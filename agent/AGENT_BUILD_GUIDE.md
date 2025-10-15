# Agent Build and Deployment Guide

Complete guide for building and deploying Tracr agents to Windows VMs with Railway API backend configuration.

## Prerequisites

### Development Environment
- **Go 1.21+**: Required for building the agent
- **Git**: For version control and repository access
- **Make**: For using the provided Makefile (Windows: use Git Bash or WSL)

### Target Environment (Windows VMs)
- **Windows Server 2016+** or **Windows 10/11**
- **Administrator access** for service installation
- **Network connectivity** to Railway API backend
- **PowerShell 5.0+** for deployment scripts

### Infrastructure
- **Railway API Backend**: `https://web-production-c4a4.up.railway.app` deployed and accessible
- **Vercel Frontend**: `https://tracr-silk.vercel.app` configured with Railway API URL
- **Admin credentials**: `admin` / `admin123` for verification

## Building the Agent

### 1. Clone Repository
```bash
git clone https://github.com/your-username/tracr.git
cd tracr/agent
```

### 2. Install Dependencies
```bash
# Install Go dependencies
make deps

# Or manually
go mod download
go mod tidy
```

### 3. Build Agent Executable
```bash
# Build for Windows (from any platform)
make build

# Manual build (Windows target)
GOOS=windows GOARCH=amd64 go build -ldflags "-w -s" -o build/agent.exe .

# Verify build output
ls -la build/
# Should show agent.exe (~10-20MB)
```

### 4. Build Version Information
```bash
# Check version will be embedded
make version

# Build with version info
make build-release
```

### 5. Optional: Build MSI Installer

**Requirements**: Windows machine with WiX Toolset installed

```powershell
# On Windows with WiX Toolset
make msi

# Manual MSI build
cd installer
build.bat
```

**MSI Features**:
- Installs agent executable to `Program Files`
- Creates Windows service automatically
- Includes Railway API URL in default config
- Sets up logging directory and permissions

## Deployment Methods

### Method A: Manual Deployment (Single VM)

**Best for**: Testing, single-machine deployments

#### Step 1: Transfer Files
```powershell
# Copy files to Windows VM (via RDP, network share, etc.)
Copy-Item build/agent.exe -Destination "C:\Temp\"
Copy-Item deploy-to-railway.ps1 -Destination "C:\Temp\"
Copy-Item verify-railway-connection.ps1 -Destination "C:\Temp\"
```

#### Step 2: Install Agent Service
```powershell
# On Windows VM, run as Administrator
cd C:\Temp
.\agent.exe -install
```

**What this does**:
- Copies `agent.exe` to `C:\Program Files\TracrAgent\`
- Creates Windows service named "TracrAgent"
- Sets service to start automatically
- Creates log directory: `C:\ProgramData\TracrAgent\logs\`

#### Step 3: Configure Railway Connection
```powershell
# Run deployment script (as Administrator)
.\deploy-to-railway.ps1
```

**Script actions**:
- Creates config file: `C:\ProgramData\TracrAgent\config.json`
- Sets API endpoint to Railway URL
- Configures logging and collection intervals
- Restarts agent service to apply changes

#### Step 4: Verify Installation
```powershell
# Run verification script
.\verify-railway-connection.ps1

# Manual verification commands
Get-Service TracrAgent                              # Check service status
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 10  # Check logs
```

### Method B: MSI Deployment (Multiple VMs)

**Best for**: Enterprise deployments, multiple machines

#### Step 1: Build MSI Installer
```powershell
# On Windows development machine
cd tracr/agent/installer
build.bat

# Verify MSI creation
dir *.msi
```

#### Step 2: Deploy via Group Policy/SCCM
```powershell
# Silent installation
msiexec /i TracrAgent-1.0.0.msi /quiet /l*v install.log

# Interactive installation
msiexec /i TracrAgent-1.0.0.msi
```

#### Step 3: Verify Deployment
```powershell
# Check on each target VM
Get-Service TracrAgent
Get-Content "C:\ProgramData\TracrAgent\config.json"
```

**MSI Benefits**:
- Railway URL pre-configured in config template
- No manual configuration needed
- Standardized deployment across multiple machines
- Automatic service installation and startup

### Method C: PowerShell Remoting (Automated)

**Best for**: Large-scale deployments, automation

#### Step 1: Prepare Script
```powershell
# deployment-script.ps1
$VMs = @('VM-001', 'VM-002', 'VM-003')  # Add your VM names
$AgentPath = "\\file-server\share\agent.exe"
$ScriptPath = "\\file-server\share\deploy-to-railway.ps1"

foreach ($VM in $VMs) {
    Write-Host "Deploying to $VM..." -ForegroundColor Green
    
    # Copy files
    Copy-Item $AgentPath -Destination "\\$VM\C$\Temp\"
    Copy-Item $ScriptPath -Destination "\\$VM\C$\Temp\"
    
    # Install and configure via PowerShell remoting
    Invoke-Command -ComputerName $VM -ScriptBlock {
        cd C:\Temp
        
        # Install service
        .\agent.exe -install
        
        # Configure for Railway
        .\deploy-to-railway.ps1 -Force
        
        # Verify installation
        Get-Service TracrAgent
    }
}
```

#### Step 2: Execute Deployment
```powershell
# Run deployment script
.\deployment-script.ps1

# Monitor progress
Get-Job | Receive-Job
```

#### Prerequisites for PowerShell Remoting:
- Enable PowerShell remoting on target VMs: `Enable-PSRemoting -Force`
- Configure trusted hosts or use domain authentication
- Ensure firewall allows WinRM traffic
- Run deployment script as domain admin or with appropriate credentials

## Post-Deployment Verification

### Comprehensive Verification Steps

#### Step 1: Service Health Check
```powershell
# Run on each Windows VM
$ServiceStatus = Get-Service TracrAgent
Write-Host "Service Status: $($ServiceStatus.Status)" 

if ($ServiceStatus.Status -ne "Running") {
    Write-Host "Service not running. Starting..." -ForegroundColor Yellow
    Start-Service TracrAgent
}
```

#### Step 2: Configuration Verification  
```powershell
# Check config file exists and has correct API URL
$ConfigPath = "C:\ProgramData\TracrAgent\config.json"
if (Test-Path $ConfigPath) {
    $Config = Get-Content $ConfigPath | ConvertFrom-Json
    Write-Host "API Endpoint: $($Config.api_endpoint)"
    
    if ($Config.api_endpoint -eq "https://web-production-c4a4.up.railway.app") {
        Write-Host "✓ Railway URL configured correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ Railway URL incorrect" -ForegroundColor Red
    }
}
```

#### Step 3: Network Connectivity Test
```powershell
# Test connectivity to Railway API
$TestResult = Test-NetConnection -ComputerName "web-production-c4a4.up.railway.app" -Port 443
if ($TestResult.TcpTestSucceeded) {
    Write-Host "✓ Network connectivity OK" -ForegroundColor Green
} else {
    Write-Host "✗ Network connectivity failed" -ForegroundColor Red
}
```

#### Step 4: Agent Log Analysis
```powershell
# Check for recent activity and registration success
$LogPath = "C:\ProgramData\TracrAgent\logs\agent.log"
if (Test-Path $LogPath) {
    $RecentLogs = Get-Content $LogPath -Tail 20
    
    # Look for registration success
    $RegistrationSuccess = $RecentLogs | Where-Object { $_ -match "registration.*success|registered.*successfully" }
    if ($RegistrationSuccess) {
        Write-Host "✓ Agent registration successful" -ForegroundColor Green
    }
    
    # Look for errors
    $Errors = $RecentLogs | Where-Object { $_ -match "ERROR|FATAL" }
    if ($Errors) {
        Write-Host "⚠ Errors found in logs:" -ForegroundColor Yellow
        $Errors | ForEach-Object { Write-Host "  $_" }
    }
}
```

#### Step 5: Frontend Verification
1. **Navigate to Vercel frontend**: https://tracr-silk.vercel.app
2. **Login** with admin credentials: `admin` / `admin123`
3. **Check Devices page**: Verify new device(s) appear in the list
4. **Verify device status**: Should show "Online" (green badge)
5. **Check device details**: Click device → verify hardware info populated
6. **Check snapshots**: Verify recent data collection (within last 15 minutes)

### Expected Timeline for Device Registration
- **Service start**: Immediate (1-2 seconds)
- **First API connection**: 30-60 seconds  
- **Device registration**: 1-2 minutes
- **First data collection**: 15 minutes (default collection interval)
- **Device appears online**: Within 5 minutes (heartbeat interval)

## Troubleshooting

### Common Installation Issues

#### Service Installation Fails
```powershell
# Error: "Access denied" or "Cannot install service"
# Solution: Run as Administrator
# Verify: Check User Account Control (UAC) settings

# Check Windows Event Log for service installation errors
Get-EventLog -LogName System -Source "Service Control Manager" -Newest 10
```

#### Service Won't Start
```powershell
# Check service status and error
Get-Service TracrAgent | Format-List *

# Check Windows Event Log
Get-EventLog -LogName System -Newest 10 | Where-Object {$_.Source -eq "TracrAgent"}

# Common causes:
# - Invalid config file JSON
# - Permission issues with log directory
# - Missing dependencies
```

#### Configuration File Issues
```powershell
# Validate JSON syntax
try {
    $Config = Get-Content "C:\ProgramData\TracrAgent\config.json" | ConvertFrom-Json
    Write-Host "✓ Config file is valid JSON" -ForegroundColor Green
} catch {
    Write-Host "✗ Config file has invalid JSON: $($_.Exception.Message)" -ForegroundColor Red
    
    # Recreate with deployment script
    .\deploy-to-railway.ps1 -Force
}
```

### Network and Connectivity Issues

#### Can't Reach Railway API
```powershell
# Test basic connectivity
Test-NetConnection web-production-c4a4.up.railway.app -Port 443

# Test with curl (if available)
curl -I https://web-production-c4a4.up.railway.app

# Common solutions:
# - Check corporate firewall settings
# - Verify DNS resolution
# - Test from different network
# - Check Railway service status
```

#### SSL/TLS Certificate Issues
```powershell
# Test SSL certificate validity
$Uri = "https://web-production-c4a4.up.railway.app"
$Request = [System.Net.WebRequest]::Create($Uri)
try {
    $Response = $Request.GetResponse()
    Write-Host "✓ SSL certificate valid" -ForegroundColor Green
    $Response.Close()
} catch {
    Write-Host "✗ SSL certificate issue: $($_.Exception.Message)" -ForegroundColor Red
}
```

#### Agent Registration Issues
```powershell
# Check agent logs for registration attempts
Select-String "registration" "C:\ProgramData\TracrAgent\logs\agent.log"

# Check for authentication errors
Select-String "auth|token|401|403" "C:\ProgramData\TracrAgent\logs\agent.log"

# Verify API endpoint responds to registration requests
curl -X POST https://web-production-c4a4.up.railway.app/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test","platform":"windows"}'
```

### Frontend Integration Issues

#### Device Not Appearing in Dashboard
1. **Check agent logs**: Verify registration was successful
2. **Check Railway API logs**: Verify device registration was processed  
3. **Refresh frontend**: Hard refresh browser (Ctrl+F5)
4. **Check database**: Verify device record exists in PostgreSQL
5. **Time sync**: Ensure Windows VM and Railway have synchronized time

#### Device Shows "Offline" Status
- **Cause**: No heartbeat received in last 5 minutes
- **Check**: Agent service running and sending heartbeats
- **Logs**: Look for heartbeat messages in agent logs
- **Solution**: Restart agent service, verify network connectivity

## Updating Agents

### Rolling Update Process

#### Step 1: Build New Version
```bash
# Update version in code
git tag v1.0.1
make build-release
```

#### Step 2: Test Update on Single VM
```powershell
# Stop service
Stop-Service TracrAgent

# Backup current executable
Copy-Item "C:\Program Files\TracrAgent\agent.exe" "C:\Program Files\TracrAgent\agent.exe.backup"

# Replace with new version
Copy-Item "agent.exe" "C:\Program Files\TracrAgent\agent.exe"

# Start service
Start-Service TracrAgent

# Verify version
C:\"Program Files"\TracrAgent\agent.exe -version
```

#### Step 3: Automated Rolling Update
```powershell
# update-agents.ps1
$VMs = @('VM-001', 'VM-002', 'VM-003')
$NewAgentPath = "\\file-server\share\agent-v1.0.1.exe"

foreach ($VM in $VMs) {
    Write-Host "Updating agent on $VM..." -ForegroundColor Green
    
    Invoke-Command -ComputerName $VM -ScriptBlock {
        param($AgentPath)
        
        # Stop service
        Stop-Service TracrAgent
        
        # Backup and replace
        $InstallPath = "C:\Program Files\TracrAgent\agent.exe"
        Copy-Item $InstallPath "$InstallPath.backup"
        Copy-Item $AgentPath $InstallPath
        
        # Start service
        Start-Service TracrAgent
        
        # Verify
        & $InstallPath -version
        
    } -ArgumentList $NewAgentPath
    
    # Wait before next VM
    Start-Sleep -Seconds 30
}
```

This guide provides comprehensive instructions for building, deploying, and maintaining Tracr agents in a production environment with Railway API backend integration.