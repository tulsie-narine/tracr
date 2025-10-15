# Verify Tracr Agent Connection to Railway API Backend
param([string]$ApiUrl = "https://web-production-c4a4.up.railway.app")

Write-Host "Tracr Agent - Railway Connection Verification" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Define paths
$ConfigPath = "C:\ProgramData\TracrAgent\config.json"
$LogPath = "C:\ProgramData\TracrAgent\logs\agent.log"
$ServiceName = "TracrAgent"

Write-Host "`nTesting network connectivity..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "SUCCESS: API connectivity OK (Status: $($response.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "WARNING: API connectivity test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`nChecking agent service..." -ForegroundColor Cyan
try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    Write-Host "Service Status: $($service.Status)" -ForegroundColor $(if($service.Status -eq 'Running'){'Green'}else{'Yellow'})
}
catch {
    Write-Host "ERROR: Service not found: $ServiceName" -ForegroundColor Red
}

Write-Host "`nChecking configuration..." -ForegroundColor Cyan
if (Test-Path $ConfigPath) {
    try {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        Write-Host "SUCCESS: Configuration file valid" -ForegroundColor Green
        Write-Host "API Endpoint: $($config.api_endpoint)" -ForegroundColor White
        Write-Host "Collection Interval: $($config.collection_interval)" -ForegroundColor White
        Write-Host "Log Level: $($config.log_level)" -ForegroundColor White
    }
    catch {
        Write-Host "ERROR: Configuration file invalid: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Message -like "*invalid character*") {
            Write-Host "This is likely a UTF-8 BOM issue. Run fix-config-bom.bat to resolve." -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "ERROR: Configuration file not found: $ConfigPath" -ForegroundColor Red
}

Write-Host "`nChecking agent logs..." -ForegroundColor Cyan
if (Test-Path $LogPath) {
    Write-Host "SUCCESS: Log file accessible" -ForegroundColor Green
    Write-Host "`nRecent Log Entries:" -ForegroundColor Cyan
    try {
        $logEntries = Get-Content $LogPath -Tail 5 -ErrorAction Stop
        foreach ($entry in $logEntries) {
            if ($entry -like "*ERROR*") {
                Write-Host "  $entry" -ForegroundColor Red
            }
            elseif ($entry -like "*WARNING*") {
                Write-Host "  $entry" -ForegroundColor Yellow
            }
            else {
                Write-Host "  $entry" -ForegroundColor White
            }
        }
    }
    catch {
        Write-Host "WARNING: Could not read log file: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "INFO: No log file found (service may not have started)" -ForegroundColor Cyan
}

Write-Host "`nVerification Summary:" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host "Railway API: $ApiUrl" -ForegroundColor White
Write-Host "Web Frontend: https://tracr-silk.vercel.app" -ForegroundColor White
Write-Host "Login: admin / admin123" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "• Check Vercel frontend for this device" -ForegroundColor Yellow
Write-Host "• Verify device shows 'Online' status" -ForegroundColor Yellow
Write-Host "• Monitor logs for successful data collection" -ForegroundColor Yellow