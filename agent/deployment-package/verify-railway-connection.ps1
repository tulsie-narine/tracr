# Verify Tracr Agent Connection to Railway API Backend
# This script performs comprehensive connectivity and configuration verification

param(
    [string]$ApiUrl = "https://web-production-c4a4.up.railway.app"
)

Write-Host "Tracr Agent - Railway Connection Verification" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Define paths and constants
$ConfigPath = "C:\ProgramData\TracrAgent\config.json"
$LogPath = "C:\ProgramData\TracrAgent\logs\agent.log"
$ServiceName = "TracrAgent"

function Write-Status($Message, $Status) {
    switch ($Status) {
        "Success" { Write-Host "✓ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "✗ $Message" -ForegroundColor Red }
        "Info" { Write-Host "ℹ $Message" -ForegroundColor Cyan }
    }
}

function Test-ApiConnectivity($Url) {
    try {
        # Parse URL to get hostname and port
        $uri = [System.Uri]::new($Url)
        $hostname = $uri.Host
        $port = if ($uri.Port -eq -1) { if ($uri.Scheme -eq "https") { 443 } else { 80 } } else { $uri.Port }
        
        Write-Host "`nTesting network connectivity..." -ForegroundColor Cyan
        
        # Test TCP connectivity
        try {
            $tcpTest = Test-NetConnection -ComputerName $hostname -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($tcpTest) {
                Write-Status "TCP connectivity to $hostname`:$port" "Success"
            } else {
                Write-Status "TCP connectivity to $hostname`:$port failed" "Error"
                return $false
            }
        } catch {
            Write-Status "Network connectivity test failed: $_" "Error"
            return $false
        }
        
        # Test HTTP/HTTPS connectivity
        try {
            $response = Invoke-WebRequest -Uri $Url -Method HEAD -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            Write-Status "HTTP response from API (Status: $($response.StatusCode))" "Success"
            return $true
        } catch {
            # Try to get more specific error information
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.Value__
                Write-Status "HTTP response from API (Status: $statusCode)" "Warning"
                return $true  # API is responding, even with error status
            } else {
                Write-Status "HTTP request failed: $($_.Exception.Message)" "Error"
                return $false
            }
        }
    } catch {
        Write-Status "Connectivity test error: $_" "Error"
        return $false
    }
}

# Test 1: Network Connectivity
Write-Status "Starting connectivity verification for: $ApiUrl" "Info"
$connectivityOk = Test-ApiConnectivity -Url $ApiUrl

# Test 2: Service Status
Write-Host "`nChecking agent service..." -ForegroundColor Cyan
try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    Write-Status "Agent service exists (Status: $($service.Status))" $(if ($service.Status -eq "Running") { "Success" } else { "Warning" })
    
    if ($service.Status -ne "Running") {
        Write-Status "Service is not running - agent cannot communicate with API" "Warning"
    }
} catch {
    Write-Status "Agent service not found" "Error"
    Write-Host "  Install the service with: .\agent.exe -install" -ForegroundColor Yellow
}

# Test 3: Configuration File
Write-Host "`nChecking configuration..." -ForegroundColor Cyan
if (Test-Path $ConfigPath) {
    try {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        Write-Status "Configuration file exists and is valid JSON" "Success"
        
        # Check API endpoint
        if ($config.api_endpoint) {
            if ($config.api_endpoint -eq $ApiUrl) {
                Write-Status "API endpoint correctly configured: $($config.api_endpoint)" "Success"
            } else {
                Write-Status "API endpoint mismatch: Expected '$ApiUrl', Found '$($config.api_endpoint)'" "Warning"
            }
        } else {
            Write-Status "API endpoint not configured in config file" "Error"
        }
        
        # Check device registration
        if ($config.device_id -and $config.device_token) {
            Write-Status "Device is registered (ID: $($config.device_id.Substring(0,8))...)" "Success"
        } elseif ($config.device_id) {
            Write-Status "Device has ID but no token (registration may be incomplete)" "Warning"
        } else {
            Write-Status "Device not yet registered (first-time setup)" "Info"
        }
        
        # Display key configuration values
        Write-Host "`nConfiguration Summary:" -ForegroundColor Cyan
        Write-Host "  API Endpoint: $($config.api_endpoint)" -ForegroundColor White
        Write-Host "  Collection Interval: $($config.collection_interval)" -ForegroundColor White
        Write-Host "  Log Level: $($config.log_level)" -ForegroundColor White
        Write-Host "  Device Registered: $(if ($config.device_token) { 'Yes' } else { 'No' })" -ForegroundColor White
        
    } catch {
        Write-Status "Configuration file exists but contains invalid JSON: $_" "Error"
    }
} else {
    Write-Status "Configuration file not found: $ConfigPath" "Error"
    Write-Host "  Run deployment script: .\deploy-to-railway.ps1" -ForegroundColor Yellow
}

# Test 4: Agent Logs
Write-Host "`nChecking agent logs..." -ForegroundColor Cyan
if (Test-Path $LogPath) {
    try {
        $logLines = Get-Content $LogPath -Tail 10 -ErrorAction Stop
        Write-Status "Agent log file accessible" "Success"
        
        # Look for recent activity and common patterns
        $recentLines = $logLines | Where-Object { $_ -match (Get-Date).ToString("yyyy-MM-dd") }
        if ($recentLines) {
            Write-Status "Recent log activity found" "Success"
            
            # Check for registration success
            $registrationSuccess = $logLines | Where-Object { $_ -match "registration.*success|registered.*successfully" }
            if ($registrationSuccess) {
                Write-Status "Registration success found in logs" "Success"
            }
            
            # Check for connection errors
            $connectionErrors = $logLines | Where-Object { $_ -match "connection.*failed|unable to connect|timeout" }
            if ($connectionErrors) {
                Write-Status "Connection errors found in recent logs" "Warning"
            }
            
            # Display recent log entries
            Write-Host "`nRecent Log Entries:" -ForegroundColor Cyan
            $logLines | ForEach-Object {
                if ($_ -match "ERROR") {
                    Write-Host "  $_" -ForegroundColor Red
                } elseif ($_ -match "WARN") {
                    Write-Host "  $_" -ForegroundColor Yellow
                } else {
                    Write-Host "  $_" -ForegroundColor Gray
                }
            }
        } else {
            Write-Status "No recent log activity found" "Warning"
        }
    } catch {
        Write-Status "Cannot read agent log file: $_" "Warning"
    }
} else {
    Write-Status "Agent log file not found: $LogPath" "Warning"
    Write-Host "  Log file will be created when agent starts" -ForegroundColor Yellow
}

# Final Assessment
Write-Host "`nVerification Summary:" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

if ($connectivityOk) {
    Write-Status "Network connectivity to Railway API: OK" "Success"
} else {
    Write-Status "Network connectivity to Railway API: FAILED" "Error"
}

# Provide troubleshooting recommendations
Write-Host "`nTroubleshooting Recommendations:" -ForegroundColor Cyan

if (-not $connectivityOk) {
    Write-Host "• Check internet connectivity and firewall settings" -ForegroundColor Yellow
    Write-Host "• Verify Railway API URL is correct: $ApiUrl" -ForegroundColor Yellow
    Write-Host "• Test manual connectivity: curl $ApiUrl" -ForegroundColor Yellow
}

try {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Host "• Install agent service: .\agent.exe -install" -ForegroundColor Yellow
    } elseif ($service.Status -ne "Running") {
        Write-Host "• Start agent service: Start-Service TracrAgent" -ForegroundColor Yellow
    }
} catch {}

if (-not (Test-Path $ConfigPath)) {
    Write-Host "• Configure agent for Railway: .\deploy-to-railway.ps1" -ForegroundColor Yellow
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "• Check Vercel frontend: https://tracr-silk.vercel.app" -ForegroundColor Yellow
Write-Host "• Login with admin credentials: admin / admin123" -ForegroundColor Yellow
Write-Host "• Verify device appears in Devices list" -ForegroundColor Yellow
Write-Host "• Check device shows 'Online' status (green badge)" -ForegroundColor Yellow