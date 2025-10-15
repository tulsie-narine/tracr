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
    if exist "C:\Program Files\TracrAgent\agent.exe" (
        "C:\Program Files\TracrAgent\agent.exe" -uninstall >nul 2>&1
    ) else (
        agent.exe -uninstall >nul 2>&1
    )
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

echo Step 2: Creating installation directory...
if not exist "C:\Program Files\TracrAgent" (
    mkdir "C:\Program Files\TracrAgent"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create installation directory. Make sure you're running as Administrator.
        pause
        exit /b 1
    )
    echo SUCCESS: Installation directory created.
) else (
    echo Installation directory already exists.
)
echo.

echo Step 3: Copying agent executable...
copy "agent.exe" "C:\Program Files\TracrAgent\agent.exe" >nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy agent executable. Make sure you're running as Administrator.
    pause
    exit /b 1
)
echo SUCCESS: Agent executable copied to C:\Program Files\TracrAgent\
echo.

echo Step 4: Creating required directories...
if not exist "C:\ProgramData\TracrAgent" (
    mkdir "C:\ProgramData\TracrAgent"
    echo SUCCESS: Created config directory: C:\ProgramData\TracrAgent
) else (
    echo Config directory already exists.
)

if not exist "C:\ProgramData\TracrAgent\data" (
    mkdir "C:\ProgramData\TracrAgent\data"
    echo SUCCESS: Created data directory: C:\ProgramData\TracrAgent\data
) else (
    echo Data directory already exists.
)

if not exist "C:\ProgramData\TracrAgent\logs" (
    mkdir "C:\ProgramData\TracrAgent\logs"
    echo SUCCESS: Created logs directory: C:\ProgramData\TracrAgent\logs
) else (
    echo Logs directory already exists.
)

if not exist "C:\ProgramData\TracrAgent\data\snapshots" (
    mkdir "C:\ProgramData\TracrAgent\data\snapshots"
    echo SUCCESS: Created snapshots directory: C:\ProgramData\TracrAgent\data\snapshots
) else (
    echo Snapshots directory already exists.
)
echo.

echo Step 5: Creating initial configuration...
if not exist "C:\ProgramData\TracrAgent\config.json" (
    echo Creating default configuration file without BOM...
    powershell -Command "$config = @{'api_endpoint' = 'https://web-production-c4a4.up.railway.app'; 'collection_interval' = '15m'; 'jitter_percent' = 0.1; 'max_retries' = 5; 'backoff_multiplier' = 2.0; 'max_backoff_time' = '5m'; 'data_dir' = 'C:\ProgramData\TracrAgent\data'; 'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'; 'log_level' = 'INFO'; 'log_dir' = 'C:\ProgramData\TracrAgent\logs'; 'request_timeout' = '30s'; 'heartbeat_interval' = '5m'; 'command_poll_interval' = '60s'}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline"
    if %errorlevel% equ 0 (
        echo SUCCESS: Configuration file created without BOM.
    ) else (
        echo WARNING: PowerShell config creation failed, using fallback method.
        echo { > "C:\ProgramData\TracrAgent\config.json"
        echo   "api_endpoint": "https://web-production-c4a4.up.railway.app", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "collection_interval": "15m", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "jitter_percent": 0.1, >> "C:\ProgramData\TracrAgent\config.json"
        echo   "max_retries": 5, >> "C:\ProgramData\TracrAgent\config.json"
        echo   "backoff_multiplier": 2.0, >> "C:\ProgramData\TracrAgent\config.json"
        echo   "max_backoff_time": "5m", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "data_dir": "C:\\ProgramData\\TracrAgent\\data", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "snapshot_path": "C:\\ProgramData\\TracrAgent\\data\\snapshots", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "log_level": "INFO", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "log_dir": "C:\\ProgramData\\TracrAgent\\logs", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "request_timeout": "30s", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "heartbeat_interval": "5m", >> "C:\ProgramData\TracrAgent\config.json"
        echo   "command_poll_interval": "60s" >> "C:\ProgramData\TracrAgent\config.json"
        echo } >> "C:\ProgramData\TracrAgent\config.json"
        echo WARNING: Config created with potential BOM - run fix-config-bom.bat if service fails.
    )
) else (
    echo Configuration file already exists.
)
echo.

echo Step 6: Installing Agent Service...
"C:\Program Files\TracrAgent\agent.exe" -install
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

echo Step 7: Configuring for Railway...
powershell -ExecutionPolicy Bypass -File "deploy-to-railway-clean.ps1"
if %errorlevel% neq 0 (
    echo ERROR: Failed to configure agent. Check the PowerShell output above.
    echo.
    echo If PowerShell syntax errors persist, try running the script directly:
    echo   powershell -ExecutionPolicy Bypass -File "deploy-to-railway-clean.ps1"
    pause
    exit /b 1
)
echo SUCCESS: Agent configured for Railway.
echo.

echo Step 8: Verifying Installation...
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