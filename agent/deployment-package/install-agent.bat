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
        echo Validating configuration file...
        powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Out-Null; Write-Host 'SUCCESS: Configuration file created and validated (no BOM).' } catch { Write-Host 'ERROR: Configuration validation failed:' $_.Exception.Message }" 
    ) else (
        echo WARNING: PowerShell config creation failed, using fallback method.
        echo Note: Fallback method may create BOM that causes service startup issues.
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
        echo WARNING: Config created with potential BOM. If service fails to start,
        echo          the issue is likely UTF-8 BOM in config.json file.
    )
) else (
    echo Configuration file already exists.
    echo Checking for BOM issues in existing config...
    powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Out-Null; Write-Host 'SUCCESS: Existing configuration is valid.' } catch { if ($_.Exception.Message -like '*invalid character*') { Write-Host 'WARNING: Existing config has BOM issues. Recreating clean config...'; Remove-Item 'C:\ProgramData\TracrAgent\config.json' -Force; $config = @{'api_endpoint' = 'https://web-production-c4a4.up.railway.app'; 'collection_interval' = '15m'; 'jitter_percent' = 0.1; 'max_retries' = 5; 'backoff_multiplier' = 2.0; 'max_backoff_time' = '5m'; 'data_dir' = 'C:\ProgramData\TracrAgent\data'; 'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'; 'log_level' = 'INFO'; 'log_dir' = 'C:\ProgramData\TracrAgent\logs'; 'request_timeout' = '30s'; 'heartbeat_interval' = '5m'; 'command_poll_interval' = '60s'}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline; Write-Host 'SUCCESS: Clean configuration created.' } else { Write-Host 'ERROR: Configuration validation failed:' $_.Exception.Message } }"
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
    echo Common solutions:
    echo 1. If PowerShell syntax errors: Run deploy-to-railway-clean.ps1 directly
    echo 2. If service fails to start: The issue is likely UTF-8 BOM in config.json
    echo 3. For BOM issues: Delete config.json and rerun this installer
    echo 4. Manual fix: Run fix-config-bom.bat (if available)
    echo.
    echo Attempting automatic BOM fix with enhanced retry logic...
    echo Stopping service completely...
    sc stop TracrAgent >nul 2>&1
    timeout /t 5 /nobreak >nul
    
    echo Removing config file with potential BOM...
    del "C:\ProgramData\TracrAgent\config.json" >nul 2>&1
    timeout /t 1 /nobreak >nul
    
    echo Creating new clean config file...
    powershell -Command "$config = @{'api_endpoint' = 'https://web-production-c4a4.up.railway.app'; 'collection_interval' = '15m'; 'jitter_percent' = 0.1; 'max_retries' = 5; 'backoff_multiplier' = 2.0; 'max_backoff_time' = '5m'; 'data_dir' = 'C:\ProgramData\TracrAgent\data'; 'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'; 'log_level' = 'INFO'; 'log_dir' = 'C:\ProgramData\TracrAgent\logs'; 'request_timeout' = '30s'; 'heartbeat_interval' = '5m'; 'command_poll_interval' = '60s'}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline"
    
    echo Attempting service restart with retry logic...
    set retry_count=0
    :retry_service_start
    set /a retry_count+=1
    echo Attempt %retry_count%: Starting service...
    sc start TracrAgent >nul 2>&1
    if %errorlevel% equ 0 (
        echo Waiting for service to fully initialize...
        timeout /t 3 /nobreak >nul
        sc query TracrAgent | find "RUNNING" >nul
        if %errorlevel% equ 0 (
            echo SUCCESS: Service started and running successfully!
            goto service_started
        ) else (
            echo Service started but not yet running, waiting longer...
            timeout /t 5 /nobreak >nul
            sc query TracrAgent | find "RUNNING" >nul
            if %errorlevel% equ 0 (
                echo SUCCESS: Service is now running!
                goto service_started
            )
        )
    )
    
    if %retry_count% lss 3 (
        echo Retry %retry_count% failed, waiting and trying again...
        timeout /t 3 /nobreak >nul
        goto retry_service_start
    ) else (
        echo ERROR: Failed to start service after 3 attempts.
        echo Checking Windows Event Log for detailed errors...
        powershell -Command "Get-EventLog -LogName Application -Source 'TracrAgent' -Newest 3 -ErrorAction SilentlyContinue | Format-Table -Wrap"
        echo.
        echo Manual troubleshooting options:
        echo 1. Run troubleshoot-service.bat for detailed diagnosis
        echo 2. Check Event Viewer ^> Windows Logs ^> Application
        echo 3. Manually run: sc start TracrAgent
        pause
        exit /b 1
    )
    :service_started
)
echo SUCCESS: Agent configured for Railway.
echo.

echo Step 8: Final Service Verification...
echo Checking service status one more time...
sc query TracrAgent | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo SUCCESS: Service is confirmed running!
) else (
    echo WARNING: Service may not be running properly.
    echo Attempting final restart...
    sc stop TracrAgent >nul 2>&1
    timeout /t 3 /nobreak >nul
    sc start TracrAgent >nul 2>&1
    timeout /t 5 /nobreak >nul
    sc query TracrAgent | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo SUCCESS: Final restart worked!
    ) else (
        echo ERROR: Service still not running. Manual intervention required.
    )
)
echo.

echo Step 9: Running Connection Verification...
powershell -ExecutionPolicy Bypass -File "verify-railway-connection-clean.ps1"
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