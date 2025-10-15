# Tracr Agent Installation Troubleshooting Guide

## Quick Fix for "Service Already Exists" Error

If you encounter the error "service TracrAgent already exists", follow these steps:

### Option 1: Use the Automatic Removal (Recommended)
1. Run `uninstall-agent.bat` as Administrator first
2. Wait for complete removal
3. Then run `install-agent.bat` as Administrator

### Option 2: Manual Removal Steps
1. **Stop the existing service:**
   ```cmd
   sc stop TracrAgent
   ```

2. **Remove the service registration:**
   ```cmd
   sc delete TracrAgent
   ```

3. **Clean up files (optional but recommended):**
   ```cmd
   rmdir /s /q "C:\Program Files\TracrAgent"
   rmdir /s /q "C:\ProgramData\TracrAgent"
   ```

4. **Wait 30 seconds**, then run `install-agent.bat` again

## Installation Requirements

- **Windows Administrator privileges required**
- **Windows 10/11 or Windows Server 2016+**
- **Network access to Railway API endpoint**

## Complete Installation Process

### Step 0: Test with System Tray (Optional but Recommended)
1. **Download and extract** deployment package
2. **Test first:** Run `run-with-tray.bat` or `agent-tray.exe -tray`
3. **Verify registration** in tray menu within 30 seconds
4. **Check device appears** at https://tracr-silk.vercel.app
5. **If working,** proceed to service installation
6. **If not working,** troubleshoot using tray menu before installing service

### Step 1-5: Service Installation
1. **Download the deployment package** to your local machine
2. **Extract all files** to a folder (e.g., `C:\Temp\TracrAgent`)
3. **Right-click Command Prompt** → "Run as administrator"
4. **Navigate to the folder:** `cd C:\Temp\TracrAgent`
5. **Run the installer:** `install-agent.bat`

## Pre-Installation Testing (Recommended)

**Before installing as a Windows service, test the agent using system tray mode:**

### Quick Test Procedure
1. **Extract files** to folder: `C:\Temp\TracrAgent`
2. **Open Command Prompt** (no admin required for testing)
3. **Navigate to folder:** `cd C:\Temp\TracrAgent`
4. **Run tray version:** `agent-tray.exe -tray` or `run-with-tray.bat`
5. **Look for Tracr icon** in system tray (bottom-right corner)
6. **Right-click icon** and check status
7. **Wait 30 seconds** for registration
8. **Status should show** "✓ Registered"
9. **Verify device appears** at https://tracr-silk.vercel.app
10. **If successful,** proceed with service installation
11. **If failed,** use tray menu to troubleshoot (Open Logs, Force Check-In)

### Benefits of Testing First
- **Visual feedback** - See registration status in real-time
- **No admin privileges** - Test without system changes
- **Easy troubleshooting** - Direct access to logs and configuration
- **Manual control** - Force registration if needed
- **Quick verification** - Instant feedback on connectivity

## Files in This Package

- `agent.exe` - Service version for production deployment (9.6MB)
- `agent-tray.exe` - System tray version for testing (9.6MB)
- `run-with-tray.bat` - Quick launcher for tray mode
- `install-agent.bat` - Automated installation script
- `uninstall-agent.bat` - Complete removal tool
- `deploy-to-railway.ps1` - Railway API configuration script
- `verify-railway-connection.ps1` - Connection verification script
- `DEPLOYMENT_INSTRUCTIONS.md` - This file

## Installation Steps Explained

The installer performs these actions:

1. **Checks for existing installation** - Automatically removes old versions
2. **Installs Windows service** - Registers TracrAgent as a system service  
3. **Configures Railway API** - Sets endpoint to https://web-production-c4a4.up.railway.app
4. **Starts the service** - Begins data collection immediately
5. **Verifies connection** - Tests API connectivity and authentication

## Troubleshooting with System Tray

If the service installation succeeds but devices don't appear in the dashboard:

### Method 1: Use System Tray for Diagnosis
1. **Stop the service:** `Stop-Service TracrAgent`
2. **Run tray version:** `agent-tray.exe -tray`
3. **Check status** in tray menu
4. **Use "Force Check-In"** if not registered
5. **Check "Open Logs"** for error details
6. **Fix issues** before restarting service

### Method 2: Check Service Logs
1. **View logs:** `C:\ProgramData\TracrAgent\logs\agent.log`
2. **Look for:** "Registration successful" or error messages
3. **Common issues:** Network connectivity, API endpoint, JSON syntax

### Method 3: Manual Verification
1. **Check config:** `C:\ProgramData\TracrAgent\config.json`
2. **Verify device_id and device_token** fields are not empty
3. **Test API:** Open https://web-production-c4a4.up.railway.app in browser
4. **Check dashboard:** Login to https://tracr-silk.vercel.app

## When to Use Tray Mode vs Service Mode

### Use System Tray Mode for:
- **Initial testing** - Verify agent works before installing service
- **Troubleshooting** - Visual feedback and manual controls
- **Development** - Real-time status updates  
- **Temporary monitoring** - Short-term data collection

### Use Service Mode for:
- **Production deployment** - Automatic startup and unattended operation
- **Long-term monitoring** - Continuous data collection
- **Running without user login** - Service runs as SYSTEM account
- **Automatic restart** - Service recovers from crashes automatically

**Recommendation:** Always test with tray mode first, then install as service for production use.