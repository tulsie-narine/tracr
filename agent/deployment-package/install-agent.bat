@echo off
echo Tracr Agent - Railway Deployment
echo =================================
echo.
echo This script will install and configure the Tracr Agent for Railway API backend.
echo.
pause

echo Step 1: Checking for existing installation...
sc query TracrAgent >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Existing TracrAgent service found. Removing it first...
    echo.
    echo Stopping existing service...
    sc stop TracrAgent >nul 2>&1
    timeout /t 3 /nobreak >nul
    
    echo Uninstalling existing service...
    agent.exe -uninstall
    if %errorlevel% neq 0 (
        echo WARNING: Failed to uninstall existing service. Trying alternative method...
        sc delete TracrAgent >nul 2>&1
    )
    
    echo Waiting for cleanup...
    timeout /t 5 /nobreak >nul
    echo SUCCESS: Existing installation removed.
    echo.
) else (
    echo No existing installation found.
    echo.
)

echo Step 2: Installing Agent Service...
agent.exe -install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install agent service. Make sure you're running as Administrator.
    echo.
    echo Troubleshooting steps:
    echo 1. Right-click Command Prompt and select "Run as administrator"
    echo 2. Make sure no antivirus is blocking the installation
    echo 3. Try running: sc delete TracrAgent
    echo 4. Then run this installer again
    pause
    exit /b 1
)
echo SUCCESS: Agent service installed.
echo.

echo Step 3: Configuring for Railway...
powershell -ExecutionPolicy Bypass -File "deploy-to-railway.ps1"
if %errorlevel% neq 0 (
    echo ERROR: Failed to configure agent. Check the PowerShell output above.
    pause
    exit /b 1
)
echo SUCCESS: Agent configured for Railway.
echo.

echo Step 4: Verifying Installation...
powershell -ExecutionPolicy Bypass -File "verify-railway-connection.ps1"
echo.

echo Deployment Complete!
echo ===================
echo.
echo The agent is now installed and configured to connect to:
echo API Endpoint: https://web-production-c4a4.up.railway.app
echo.
echo Verify in the web frontend:
echo 1. Go to: https://tracr-silk.vercel.app
echo 2. Login: admin / admin123
echo 3. Check Devices page for this machine
echo.
echo The device should appear within 1-2 minutes and show "Online" status.
echo Data collection starts within 15 minutes.
echo.
pause