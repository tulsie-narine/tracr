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

1. **Download the deployment package** to your local machine
2. **Extract all files** to a folder (e.g., `C:\Temp\TracrAgent`)
3. **Right-click Command Prompt** → "Run as administrator"
4. **Navigate to the folder:** `cd C:\Temp\TracrAgent`
5. **Run the installer:** `install-agent.bat`

## Files in This Package

- `agent.exe` - The main Tracr Agent executable (9.3MB)
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