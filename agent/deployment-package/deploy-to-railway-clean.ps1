# Deploy Tracr Agent to Railway API Backend
# This script configures an existing Tracr Agent installation to connect to the Railway API backend

param(
    [string]$ApiUrl = "https://web-production-c4a4.up.railway.app",
    [switch]$Force
)

Write-Host "Tracr Agent - Railway Deployment Configuration" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Define paths
$AgentExePath = "C:\Program Files\TracrAgent\agent.exe"
$ConfigPath = "C:\ProgramData\TracrAgent\config.json"
$ServiceName = "TracrAgent"

Write-Host "Step 1: Verifying agent installation..." -ForegroundColor Cyan

# Check if agent executable exists
if (-not (Test-Path $AgentExePath)) {
    Write-Host "ERROR: Agent executable not found at $AgentExePath" -ForegroundColor Red
    Write-Host "Please install the Tracr Agent first using:" -ForegroundColor Yellow
    Write-Host "  .\agent.exe -install" -ForegroundColor Yellow
    exit 1
}

Write-Host "Success: Agent executable found" -ForegroundColor Green

# Check if agent service exists
try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    Write-Host "Success: Agent service found (Status: $($service.Status))" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Agent service not found" -ForegroundColor Red
    Write-Host "Please install the agent service first using:" -ForegroundColor Yellow
    Write-Host "  .\agent.exe -install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 2: Configuring Railway API endpoint..." -ForegroundColor Cyan

# Create config directory if it doesn't exist
$ConfigDir = Split-Path $ConfigPath -Parent
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    Write-Host "Success: Created config directory: $ConfigDir" -ForegroundColor Green
}

# Read existing config or create default
$config = @{}
if (Test-Path $ConfigPath) {
    try {
        $configContent = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        $config = @{
            api_endpoint = $configContent.api_endpoint
            collection_interval = $configContent.collection_interval
            jitter_percent = $configContent.jitter_percent
            max_retries = $configContent.max_retries
            backoff_multiplier = $configContent.backoff_multiplier
            max_backoff_time = $configContent.max_backoff_time
            log_level = $configContent.log_level
            request_timeout = $configContent.request_timeout
            heartbeat_interval = $configContent.heartbeat_interval
            command_poll_interval = $configContent.command_poll_interval
            device_id = $configContent.device_id
            device_token = $configContent.device_token
        }
        Write-Host "Success: Loaded existing configuration" -ForegroundColor Green
    }
    catch {
        Write-Host "WARNING: Could not read existing config, using defaults" -ForegroundColor Yellow
    }
}

# Set default values for missing configuration
if (-not $config.collection_interval) { $config.collection_interval = "15m" }
if (-not $config.jitter_percent) { $config.jitter_percent = 0.1 }
if (-not $config.max_retries) { $config.max_retries = 5 }
if (-not $config.backoff_multiplier) { $config.backoff_multiplier = 2.0 }
if (-not $config.max_backoff_time) { $config.max_backoff_time = "5m" }
if (-not $config.log_level) { $config.log_level = "INFO" }
if (-not $config.request_timeout) { $config.request_timeout = "30s" }
if (-not $config.heartbeat_interval) { $config.heartbeat_interval = "5m" }
if (-not $config.command_poll_interval) { $config.command_poll_interval = "60s" }

# Update API endpoint
$oldEndpoint = $config.api_endpoint
$config.api_endpoint = $ApiUrl

if ($oldEndpoint -eq $ApiUrl -and -not $Force) {
    Write-Host "Success: API endpoint already configured for Railway: $ApiUrl" -ForegroundColor Green
}
else {
    # Write updated config
    try {
        $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
        Write-Host "Success: Updated API endpoint: $oldEndpoint -> $ApiUrl" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to write config file: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 3: Restarting agent service..." -ForegroundColor Cyan

# Stop service if running
if ($service.Status -eq "Running") {
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Write-Host "Success: Stopped agent service" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to stop service: $_" -ForegroundColor Red
        exit 1
    }
}

# Start service
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Write-Host "Success: Started agent service" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to start service: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Run troubleshoot-service.bat for detailed diagnosis" -ForegroundColor Yellow
    Write-Host "2. Check Windows Event Log (Application) for TracrAgent errors" -ForegroundColor Yellow
    Write-Host "3. Verify all directories exist:" -ForegroundColor Yellow
    Write-Host "   - C:\ProgramData\TracrAgent" -ForegroundColor Yellow
    Write-Host "   - C:\ProgramData\TracrAgent\data" -ForegroundColor Yellow
    Write-Host "   - C:\ProgramData\TracrAgent\logs" -ForegroundColor Yellow
    Write-Host "4. Check config file: C:\ProgramData\TracrAgent\config.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The service installation completed but failed to start." -ForegroundColor Cyan
    Write-Host "This is often due to missing directories or configuration issues." -ForegroundColor Cyan
    Write-Host "Run the updated install-agent.bat which now creates all required directories." -ForegroundColor Cyan
    exit 1
}

# Wait a moment for service to initialize
Start-Sleep -Seconds 3

# Verify service is running
$service = Get-Service -Name $ServiceName
if ($service.Status -ne "Running") {
    Write-Host "WARNING: Service is not running (Status: $($service.Status))" -ForegroundColor Yellow
    Write-Host "Check the agent logs and Windows Event Log for errors" -ForegroundColor Yellow
}
else {
    Write-Host "Success: Service is running successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host "API Endpoint: $ApiUrl" -ForegroundColor White
Write-Host "Config File: $ConfigPath" -ForegroundColor White
Write-Host "Service Status: $($service.Status)" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run verification script: .\verify-railway-connection.ps1" -ForegroundColor Yellow
Write-Host "2. Check agent logs: Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 20" -ForegroundColor Yellow
Write-Host "3. Verify device appears in web frontend: https://tracr-silk.vercel.app" -ForegroundColor Yellow
Write-Host "4. Login with: admin / admin123" -ForegroundColor Yellow

Write-Host ""
Write-Host "Deployment completed successfully!" -ForegroundColor Green