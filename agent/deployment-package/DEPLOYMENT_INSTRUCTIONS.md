# Tracr Agent - Railway Deployment Package

## Quick Start Instructions

This package contains everything needed to deploy the Tracr Agent to Windows VMs with Railway API backend configuration.

### What's Included

- `agent.exe` - Tracr Agent executable (v1.0.0-railway)
- `deploy-to-railway.ps1` - Automated configuration script  
- `verify-railway-connection.ps1` - Connection verification script
- `DEPLOYMENT_INSTRUCTIONS.md` - This file

### Railway Configuration

The agent is pre-configured to connect to:
**API Endpoint**: https://web-production-c4a4.up.railway.app

### Deployment Steps

1. **Copy all files to Windows VM** (via RDP, network share, etc.)

2. **Open PowerShell as Administrator**
   ```powershell
   # Navigate to agent directory
   cd C:\path\to\agent\files
   ```

3. **Install the Agent Service**
   ```powershell
   .\agent.exe -install
   ```
   
   This will:
   - Copy agent.exe to C:\Program Files\TracrAgent\
   - Create Windows service "TracrAgent"
   - Set service to start automatically
   - Create log directory: C:\ProgramData\TracrAgent\logs\

4. **Configure for Railway**
   ```powershell
   .\deploy-to-railway.ps1
   ```
   
   This will:
   - Create config file with Railway API URL
   - Configure collection intervals and logging
   - Restart agent service
   - Display configuration summary

5. **Verify Installation**
   ```powershell
   .\verify-railway-connection.ps1
   ```
   
   This will:
   - Test network connectivity to Railway API
   - Check agent service status
   - Validate configuration file
   - Display recent log entries
   - Provide troubleshooting recommendations

### Verification

After deployment, verify in the web frontend:

1. **Go to**: https://tracr-silk.vercel.app
2. **Login**: admin / admin123  
3. **Check Devices**: Your Windows VM should appear in the device list
4. **Status**: Device should show "Online" (green badge)
5. **Data Collection**: Check Snapshots tab for recent data (within 15 minutes)

### Expected Timeline

- Service installation: Immediate
- First API connection: 30-60 seconds
- Device registration: 1-2 minutes
- First data collection: 15 minutes (default interval)
- Device shows "Online": Within 5 minutes

### Troubleshooting

If issues occur:

1. **Run verification script**: `.\verify-railway-connection.ps1`
2. **Check agent logs**: 
   ```powershell
   Get-Content "C:\ProgramData\TracrAgent\logs\agent.log" -Tail 20
   ```
3. **Check service status**:
   ```powershell
   Get-Service TracrAgent
   ```
4. **Test Railway connectivity**:
   ```powershell
   Test-NetConnection web-production-c4a4.up.railway.app -Port 443
   ```

### Common Solutions

- **Service won't start**: Check Windows Event Log, verify config file is valid JSON
- **Can't connect to Railway**: Check firewall settings, verify network connectivity
- **Device not appearing**: Check agent logs for registration success, refresh frontend

### Support Files

For complete documentation, see the repository:
- **Complete Guide**: RAILWAY_DEPLOYMENT.md
- **Build Instructions**: agent/AGENT_BUILD_GUIDE.md  
- **Agent Documentation**: agent/README.md

### Agent Information

- **Version**: 1.0.0-railway
- **Build Date**: 2025-10-15T13:43:46Z
- **API Endpoint**: https://web-production-c4a4.up.railway.app (pre-configured)
- **Platform**: Windows x86-64
- **Service Name**: TracrAgent