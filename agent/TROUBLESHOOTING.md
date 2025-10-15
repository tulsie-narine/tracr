# Tracr Agent Troubleshooting Guide

This guide helps diagnose why devices aren't appearing in the web dashboard at https://tracr-silk.vercel.app.

## Quick Diagnostic Checklist

Run these commands in PowerShell as Administrator to check the agent status:

### 1. Check Service Status
```powershell
Get-Service TracrAgent
```
**Expected:** Status should be "Running"
- ✓ **Good:** Status = Running
- ✗ **Problem:** Status = Stopped (service not running)
- ⚠ **Warning:** Status = StartPending (service starting up)

### 2. Check Configuration File
```powershell
Get-Content "C:\ProgramData\TracrAgent\config.json" | ConvertFrom-Json | Select-Object api_endpoint, device_id, device_token
```
**Expected:** 
- `api_endpoint` = "https://web-production-c4a4.up.railway.app"
- `device_id` = non-empty string (e.g., "abc123def456")
- `device_token` = non-empty string

**Status Indicators:**
- ✓ **Good:** All fields populated with correct values
- ✗ **Problem:** device_id or device_token empty (registration failed)
- ⚠ **Warning:** api_endpoint points to wrong URL

### 3. Check Recent Logs
```powershell
Select-String "Registration\|Inventory\|ERROR" "C:\ProgramData\TracrAgent\logs\agent.log" | Select-Object -Last 10
```
**Look for these messages:**

**Success Messages:**
- ✓ `Registration successful | device_id=abc123 hostname=COMPUTER-NAME`
- ✓ `Inventory sent successfully to API`
- ✓ `Scheduler starting | interval=15m0s`

**Problem Messages:**
- ✗ `Registration failed` (followed by error details)
- ✗ `Failed to send inventory to API` (followed by error)
- ✗ `Device not registered, attempting registration...` (repeated)

### 4. Test API Connectivity
```powershell
# Test basic connectivity
Invoke-WebRequest -Uri "https://web-production-c4a4.up.railway.app/health" -UseBasicParsing

# Test registration endpoint
$body = @{
    hostname = $env:COMPUTERNAME
    os_version = "Windows 11"
    agent_version = "1.0.0"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://web-production-c4a4.up.railway.app/v1/agents/register" -Method POST -Body $body -ContentType "application/json"
```
**Expected:** Both commands return HTTP 200 responses
- ✓ **Good:** Both requests succeed
- ✗ **Problem:** Connection refused, timeout, or HTTP errors
- ⚠ **Warning:** Health check works but registration fails

## Log Analysis Guide

The agent logs to `C:\ProgramData\TracrAgent\logs\agent.log`. Here's what to look for:

### Successful Registration Flow
```
2025-10-15 12:00:00 [INFO] Device not registered, registering with API...
2025-10-15 12:00:01 [INFO] Registration successful | device_id=abc123def456 hostname=DESKTOP-ABC123
2025-10-15 12:00:02 [INFO] Scheduler starting | interval=15m0s
2025-10-15 12:00:02 [INFO] Starting inventory collection
2025-10-15 12:00:03 [INFO] Inventory sent successfully to API
```

### Registration Failure Patterns
```
# Network connectivity issues
[ERROR] Registration failed | error=Post "https://web-production-c4a4.up.railway.app/v1/agents/register": dial tcp: connection refused

# API errors
[ERROR] Registration failed | error=registration request failed: 500 Internal Server Error

# Authentication issues  
[ERROR] Failed to send inventory to API | error=request failed: 401 Unauthorized

# JSON parsing issues
[ERROR] Failed to load configuration | error=failed to load config from file: invalid character 'ï' looking for beginning of value
```

## Common Issues & Solutions

### Issue 1: Config file has empty device_id/device_token

**Symptoms:**
- Service running but device not in dashboard
- Config file shows `"device_id": ""` and `"device_token": ""`
- Logs show repeated "Device not registered, attempting registration..." messages

**Cause:** Registration never succeeded due to network or API issues

**Solution:**
1. Check logs for detailed registration error messages
2. Test API connectivity with PowerShell commands above
3. Verify firewall allows outbound HTTPS traffic
4. Check Railway API is running and accessible

### Issue 2: "Connection refused" errors

**Symptoms:**
- Logs show `connection refused` or `dial tcp` errors
- API connectivity test fails

**Cause:** Railway API not accessible or wrong URL in config

**Solution:**
1. Test Railway API status: https://web-production-c4a4.up.railway.app
2. Check firewall rules allow outbound HTTPS on port 443
3. Verify DNS resolution: `nslookup web-production-c4a4.up.railway.app`
4. Check corporate proxy settings if in enterprise environment

### Issue 3: "401 Unauthorized" errors

**Symptoms:**
- Registration succeeded (device_id exists in config)
- Logs show `401 Unauthorized` when sending inventory
- Device appears in dashboard as "Offline"

**Cause:** Device token invalid or expired

**Solution:**
1. Delete config file: `Remove-Item "C:\ProgramData\TracrAgent\config.json"`
2. Restart service: `Restart-Service TracrAgent`
3. Monitor logs for successful re-registration
4. Verify device shows "Online" in dashboard

### Issue 4: Config file has UTF-8 BOM

**Symptoms:**
- Service starts then stops immediately
- Logs show JSON parsing errors with character `'ï'` or `'Ã¯'`
- Event Viewer shows service startup failures

**Cause:** Config file edited with Windows text editor that added UTF-8 BOM

**Solution:**
1. Run the BOM fix script: `fix-config-bom.bat`
2. Or manually recreate config using PowerShell:
   ```powershell
   $config = @{
       api_endpoint = "https://web-production-c4a4.up.railway.app"
       collection_interval = "15m"
       log_level = "INFO"
   } | ConvertTo-Json
   $config | Out-File -FilePath "C:\ProgramData\TracrAgent\config.json" -Encoding UTF8 -NoNewline
   ```
3. Restart service: `Restart-Service TracrAgent`

### Issue 5: Service starts then stops immediately

**Symptoms:**
- Service status shows "Stopped" immediately after starting
- Windows Event Viewer shows service errors
- No log file created or very short log file

**Cause:** Config file JSON syntax error, missing dependencies, or permissions issue

**Solution:**
1. Check Event Viewer: Windows Logs → Application → Look for "TracrAgent" source
2. Validate config JSON:
   ```powershell
   Get-Content "C:\ProgramData\TracrAgent\config.json" | ConvertFrom-Json
   ```
3. Check file permissions on `C:\ProgramData\TracrAgent` folder
4. Run agent in console mode to see detailed errors:
   ```cmd
   cd "C:\Program Files\TracrAgent"
   agent.exe
   ```
5. Use nuclear reset installer if all else fails

## Manual Testing Procedures

### Test Railway API Connectivity
```powershell
# Basic health check
$response = Invoke-WebRequest -Uri "https://web-production-c4a4.up.railway.app/health" -UseBasicParsing
Write-Host "Health check status: $($response.StatusCode)"

# Test registration endpoint
$hostname = $env:COMPUTERNAME
$payload = @{
    hostname = $hostname
    os_version = "Windows 11 Pro"
    agent_version = "1.1.0"
} | ConvertTo-Json

try {
    $regResponse = Invoke-WebRequest -Uri "https://web-production-c4a4.up.railway.app/v1/agents/register" -Method POST -Body $payload -ContentType "application/json" -UseBasicParsing
    $regData = $regResponse.Content | ConvertFrom-Json
    Write-Host "Registration successful:"
    Write-Host "  Device ID: $($regData.device_id)"
    Write-Host "  Device Token: $($regData.device_token.Substring(0,8))..."
} catch {
    Write-Host "Registration failed: $($_.Exception.Message)"
}
```

### Expected Response Format
```json
{
  "device_id": "abc123def456ghi789",
  "device_token": "jwt.token.string.here"
}
```

### Verify Device in Dashboard
1. Open web browser
2. Navigate to: https://tracr-silk.vercel.app
3. Login with: `admin` / `admin123`
4. Go to "Devices" page
5. Look for device with hostname matching `$env:COMPUTERNAME`
6. Status should show "Online" within 5 minutes of registration

## Force Re-registration

Use this procedure when device token is invalid or you need to re-register the device:

### Step-by-Step Procedure
1. **Stop the service:**
   ```powershell
   Stop-Service TracrAgent
   ```

2. **Delete credentials:**
   ```powershell
   Remove-Item "C:\ProgramData\TracrAgent\config.json"
   ```

3. **Start the service:**
   ```powershell
   Start-Service TracrAgent
   ```

4. **Monitor registration:**
   ```powershell
   # Watch logs in real-time
   Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Wait -Tail 10
   ```

5. **Verify success:**
   - Look for "Registration successful" message
   - Check config file has device_id and device_token
   - Verify device appears in dashboard

### When to Use Force Re-registration
- Device token expired or invalid
- Device was deleted from dashboard but agent still has old credentials
- Moving agent to different API endpoint
- Troubleshooting persistent authentication issues
- After restoring agent from backup

### Verification After Re-registration
```powershell
# Check config file
Get-Content "C:\ProgramData\TracrAgent\config.json" | ConvertFrom-Json | Format-List

# Check recent logs
Select-String "Registration\|Inventory" "C:\ProgramData\TracrAgent\logs\agent.log" | Select-Object -Last 5

# Check service status
Get-Service TracrAgent

# Test web dashboard
Start-Process "https://tracr-silk.vercel.app"
```

## Getting Help

If this troubleshooting guide doesn't solve your issue:

1. **Collect diagnostic information:**
   - Service status: `Get-Service TracrAgent`
   - Config file contents (redact device_token)
   - Recent log entries (last 20 lines)
   - Windows Event Log entries for TracrAgent
   - Network connectivity test results

2. **Check documentation:**
   - [README.md](README.md) - General agent documentation
   - [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md) - Railway-specific deployment guide

3. **Common support scenarios:**
   - Agent service won't start → Check Event Viewer and config file syntax
   - Service runs but no device in dashboard → Check registration logs and API connectivity
   - Device shows "Offline" → Check inventory submission logs and token validity
   - Multiple devices with same name → Delete duplicates and ensure consistent hostname