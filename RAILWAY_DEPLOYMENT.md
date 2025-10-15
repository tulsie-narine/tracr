# Railway + Vercel Deployment Guide

Complete deployment guide for the Tracr system using Railway for the API backend and Vercel for the web frontend.

## Overview

This deployment uses:
- **API Backend**: Railway (`https://web-production-c4a4.up.railway.app`)
- **Web Frontend**: Vercel (`https://tracr-silk.vercel.app`)  
- **Database**: Railway PostgreSQL
- **Windows Agents**: Connect to Railway API backend

```
[Windows VMs] → [Railway API + PostgreSQL] ← [Vercel Frontend]
     ↓                      ↓                       ↓
[Tracr Agents]      [Data Storage]          [Web Dashboard]
```

## Prerequisites Verification

Before deploying agents, verify the infrastructure is working:

### 1. Verify Railway API Backend

Test API accessibility:
```bash
# Test basic connectivity
curl -I https://web-production-c4a4.up.railway.app

# Should return HTTP 200 or similar response
# If this fails, check Railway deployment status
```

### 2. Verify Database Migrations

Ensure database schema is set up:
- Check Railway project dashboard
- Verify PostgreSQL database is running  
- Confirm database migrations have been applied
- Check database contains necessary tables (users, devices, snapshots, etc.)

### 3. Verify Admin User Exists

Test admin login:
```bash
curl -X POST https://web-production-c4a4.up.railway.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return JWT token if successful
```

### 4. Verify Vercel Frontend

- Navigate to: https://tracr-silk.vercel.app
- Should show Tracr login page (not error message)
- Verify login works with `admin` / `admin123`
- Check environment variables are correctly configured

## Frontend Configuration (Vercel)

### Step-by-Step Vercel Environment Setup

1. **Access Vercel Dashboard**:
   - Go to: https://vercel.com/dashboard
   - Find project: `tracr-silk`
   - Navigate to: Settings → Environment Variables

2. **Configure Required Variables**:

| Variable Name | Value | Required |
|---------------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://web-production-c4a4.up.railway.app` | **YES** |
| `NEXT_PUBLIC_APP_NAME` | `Tracr` | No |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | No |

3. **Environment Configuration**:
   - Set variables for: ✅ Production ✅ Preview ✅ Development  
   - **Critical**: No trailing slash on API URL
   - Click "Save" for each variable

4. **Redeploy if Changed**:
   - Go to: Deployments tab
   - Find latest deployment → Click "..." → "Redeploy"
   - Wait for deployment to complete (~2-3 minutes)

5. **Verify Frontend**:
   ```bash
   # Test frontend loads
   curl -I https://tracr-silk.vercel.app
   
   # Test login page accessible
   curl https://tracr-silk.vercel.app/login
   ```

## Agent Configuration (Windows VMs)

### Method 1: PowerShell Script (Recommended)

Use the automated deployment script:

1. **Prerequisites**:
   - Agent installed: `agent.exe -install`
   - PowerShell as Administrator
   - Scripts available in agent directory

2. **Deploy Configuration**:
   ```powershell
   # Navigate to agent directory
   cd C:\path\to\tracr\agent
   
   # Run deployment script
   .\deploy-to-railway.ps1
   
   # Verify connectivity
   .\verify-railway-connection.ps1
   ```

3. **Script Actions**:
   - ✅ Verifies agent installation
   - ✅ Updates config file with Railway URL
   - ✅ Restarts agent service
   - ✅ Provides verification steps

### Method 2: Manual Configuration

Edit the config file directly:

1. **Create/Edit Config File**: `C:\ProgramData\TracrAgent\config.json`

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

2. **Restart Agent Service**:
   ```powershell
   Restart-Service TracrAgent
   ```

### Method 3: Environment Variable

Set system environment variable:

```powershell
# Set environment variable (requires restart)
[Environment]::SetEnvironmentVariable("TRACR_API_ENDPOINT", "https://web-production-c4a4.up.railway.app", "Machine")

# Restart agent service
Restart-Service TracrAgent
```

### Method 4: System Tray Testing (Recommended for Initial Setup)

Use system tray mode to test configuration before installing as service:

1. **Extract Deployment Package**:
   - Download agent deployment package
   - Extract to temporary directory (e.g., `C:\Temp\TracrAgent`)

2. **Test with System Tray**:
   ```cmd
   # Navigate to extracted directory
   cd C:\Temp\TracrAgent
   
   # Run tray version (no admin required for testing)
   agent-tray.exe -tray
   
   # Or use batch script
   run-with-tray.bat
   ```

3. **Verify Registration**:
   - Look for Tracr icon in system tray (bottom-right corner)
   - Right-click icon and check status
   - Wait 30 seconds for registration
   - Status should show "✓ Registered"
   - Device ID should appear in menu

4. **Check Web Dashboard**:
   - Open https://tracr-silk.vercel.app
   - Login with admin / admin123
   - Go to Devices page
   - Verify device appears with hostname

5. **Troubleshoot if Needed**:
   - If not registered, click "Force Check-In"
   - Use "Open Logs" to view error messages
   - Use "Open Config" to verify API endpoint
   - Fix issues before installing as service

6. **Install as Service** (after successful testing):
   ```cmd
   # Stop tray version (Quit from menu or Ctrl+C)
   # Install as Windows service  
   agent.exe -install
   agent.exe -start
   ```

**Benefits of Testing First:**
- **Visual Feedback**: See registration status in real-time
- **No Service Installation**: Test without system changes
- **Easy Troubleshooting**: Direct access to logs and config
- **Manual Control**: Force registration if needed
- **Quick Verification**: Instant feedback on connectivity

## Agent Deployment Workflow

### Complete Step-by-Step Process

**Step 1: Build Agent Executable**
```bash
# From agent directory
cd tracr/agent
make build

# Verify build
ls -la build/agent.exe
```

**Step 2: Copy Agent to Windows VM**
```powershell
# Via RDP, file share, or PowerShell remoting
Copy-Item agent.exe -Destination "\\VM-NAME\C$\Temp\"
Copy-Item deploy-to-railway.ps1 -Destination "\\VM-NAME\C$\Temp\"
Copy-Item verify-railway-connection.ps1 -Destination "\\VM-NAME\C$\Temp\"
```

**Step 3: Install Agent Service**
```powershell
# On Windows VM, run as Administrator
cd C:\Temp
.\agent.exe -install
```

**Step 4: Configure for Railway**
```powershell
# Run deployment script
.\deploy-to-railway.ps1
```

**Step 5: Verify Connectivity**
```powershell
# Run verification script
.\verify-railway-connection.ps1
```

**Step 6: Check Agent Logs**
```powershell
# Monitor agent logs for registration
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 20 -Wait
```

**Step 7: Verify in Frontend**
- Navigate to: https://tracr-silk.vercel.app
- Login with: `admin` / `admin123`
- Go to: Devices page
- Verify device appears with "Online" status

## Verification Checklist

Use this checklist to ensure complete deployment:

### Infrastructure Verification
- [ ] Railway API responds to health checks
- [ ] Railway PostgreSQL database is accessible
- [ ] Database migrations completed successfully
- [ ] Admin user exists and can authenticate

### Frontend Verification  
- [ ] Vercel frontend loads without errors
- [ ] Login page accessible at https://tracr-silk.vercel.app/login
- [ ] Can login with admin credentials (`admin` / `admin123`)
- [ ] Environment variable `NEXT_PUBLIC_API_URL` correctly set
- [ ] No CORS errors in browser console

### Agent Verification (Per VM)
- [ ] Agent executable installed: `C:\Program Files\TracrAgent\agent.exe`
- [ ] Agent service running: `Get-Service TracrAgent`
- [ ] Config file has Railway URL: `C:\ProgramData\TracrAgent\config.json`
- [ ] Agent config file contains device_id and device_token
- [ ] Agent logs show "Registration successful" message
- [ ] Agent logs show "Inventory sent successfully" messages
- [ ] No connection errors in agent logs
- [ ] Device appears in Vercel frontend within 5 minutes of agent start

### End-to-End Verification
- [ ] Device appears in frontend device list
- [ ] Device status shows "Online" (green badge)
- [ ] Device detail page loads successfully
- [ ] Hardware information populated
- [ ] Snapshots tab shows recent data collection
- [ ] Software tab shows installed applications
- [ ] Performance metrics available

## Troubleshooting Railway-Specific Issues

### Frontend Issues

**Problem**: "Application error: a client-side exception has occurred"
- **Cause**: Missing or incorrect `NEXT_PUBLIC_API_URL`
- **Solution**: 
  1. Check Vercel environment variables
  2. Verify URL: `https://web-production-c4a4.up.railway.app` (no trailing slash)
  3. Redeploy Vercel project
  4. Clear browser cache

**Problem**: Frontend loads but shows "Demo Mode"
- **Cause**: Environment variable pointing to placeholder URL
- **Solution**: Update `NEXT_PUBLIC_API_URL` to Railway URL and redeploy

### Agent Connection Issues

**Problem**: Agent can't connect to Railway API
- **Verification Steps**:
  ```powershell
  # Test network connectivity
  Test-NetConnection web-production-c4a4.up.railway.app -Port 443
  
  # Test HTTP connectivity  
  curl -I https://web-production-c4a4.up.railway.app
  ```
- **Common Causes**:
  - Corporate firewall blocking HTTPS traffic
  - DNS resolution issues
  - Railway service temporarily unavailable
- **Solutions**:
  - Check firewall rules (allow outbound HTTPS/443)
  - Verify DNS resolution
  - Check Railway service status

**Problem**: Agent registers but device not appearing in frontend
- **Debugging Steps**:
  ```powershell
  # Check agent logs for registration success
  Select-String "registration" "C:\ProgramData\TracrAgent\logs\agent.log" | Select-Object -Last 5
  
  # Check for API errors
  Select-String "ERROR" "C:\ProgramData\TracrAgent\logs\agent.log" | Select-Object -Last 10
  ```
- **Verification**: Check Railway API logs for device registration events

**Problem**: Device shows "Offline" status  
- **Causes**: Agent not sending heartbeats (default: every 5 minutes)
- **Check**: Agent service running and logs show heartbeat activity
- **Fix**: Restart agent service, verify network connectivity

**Problem**: Device not appearing in dashboard after agent installation
- **Cause**: Agent not registered with Railway API
- **Check**: Open `C:\ProgramData\TracrAgent\config.json`
- **Look for**: `device_id` and `device_token` fields
- **If empty**: Registration failed
- **Solution**:
  - Check agent logs: `C:\ProgramData\TracrAgent\logs\agent.log`
  - Look for "Registration failed" or "Device not registered" messages
  - Verify Railway API is accessible from agent machine
  - Test connectivity: `curl https://web-production-c4a4.up.railway.app`
  - Restart agent service to retry registration

**Problem**: Registration endpoint not responding
- **Cause**: Railway API backend not running or network issue
- **Check**: Test registration endpoint manually
- **Command**: 
  ```bash
  curl -X POST https://web-production-c4a4.up.railway.app/v1/agents/register \
    -H "Content-Type: application/json" \
    -d '{"hostname":"test","os_version":"Windows 11","agent_version":"1.0.0"}'
  ```
- **Expected**: JSON response with device_id and device_token
- **If fails**: Check Railway deployment status, check API logs

**Problem**: Device registered but not sending data
- **Cause**: Device token authentication failing
- **Check**: Config file has device_id and device_token
- **Check**: Agent logs show "Inventory sent successfully" messages
- **If not**: Check token is valid, check API authentication logs
- **Solution**: Delete config file and restart service to re-register

**Problem**: Multiple devices with same hostname
- **Cause**: Agent re-registered multiple times
- **Explanation**: API creates new device if hostname doesn't match exactly
- **Solution**: API should return existing device_id for matching hostname
- **Workaround**: Delete duplicate devices from web dashboard

### CORS Issues

**Problem**: CORS errors in browser console
- **Note**: Railway API has CORS set to `*` (allow all origins)
- **Verification**: 
  ```bash
  curl -I -H "Origin: https://tracr-silk.vercel.app" https://web-production-c4a4.up.railway.app
  ```
- **Expected**: Response should include `Access-Control-Allow-Origin: *`
- **If Missing**: Check Railway API deployment and CORS middleware

### Database Issues

**Problem**: API returns 500 errors
- **Cause**: Database connection or migration issues
- **Check**: Railway project dashboard → Database tab
- **Verify**: Database is running and accessible
- **Logs**: Check Railway API service logs for database errors

## Quick Reference

### URLs and Endpoints
- **Railway API**: `https://web-production-c4a4.up.railway.app`
- **Vercel Frontend**: `https://tracr-silk.vercel.app`
- **API Health Check**: `https://web-production-c4a4.up.railway.app/health` (if available)
- **Login Endpoint**: `https://web-production-c4a4.up.railway.app/v1/auth/login`

### Credentials
- **Admin Username**: `admin`
- **Admin Password**: `admin123`

### File Paths (Windows)
- **Agent Executable**: `C:\Program Files\TracrAgent\agent.exe`
- **Config File**: `C:\ProgramData\TracrAgent\config.json`
- **Log File**: `C:\ProgramData\TracrAgent\logs\agent.log`
- **Service Name**: `TracrAgent`

### PowerShell Scripts
- **Deploy Configuration**: `deploy-to-railway.ps1`
- **Verify Connection**: `verify-railway-connection.ps1`

### Useful Commands
```powershell
# Check service status
Get-Service TracrAgent

# Restart agent service  
Restart-Service TracrAgent

# View recent logs
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 20

# Test Railway connectivity
Test-NetConnection web-production-c4a4.up.railway.app -Port 443

# Monitor logs in real-time
Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 10 -Wait
```

This guide provides everything needed for successful deployment and troubleshooting of the Tracr system using Railway and Vercel.