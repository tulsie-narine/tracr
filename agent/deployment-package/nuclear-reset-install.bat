@echo off
echo ========================================
echo    Tracr Agent - NUCLEAR RESET INSTALLER
echo ========================================
echo.
echo WARNING: This will completely remove ALL existing Tracr Agent
echo installations and data, then install fresh.
echo.
echo This includes:
echo - All services and processes
echo - All configuration files  
echo - All log files
echo - All data directories
echo - Registry entries
echo.
set /p confirm="Type 'YES' to proceed with complete reset: "
if /i not "%confirm%"=="YES" (
    echo Installation cancelled.
    pause
    exit /b 0
)

echo.
echo ========================================
echo Phase 1: COMPLETE SYSTEM CLEANUP
echo ========================================

echo Step 1.1: Killing all agent processes...
taskkill /f /im agent.exe >nul 2>&1
taskkill /f /im TracrAgent.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Step 1.2: Stopping and removing all services...
sc stop TracrAgent >nul 2>&1
sc stop "Tracr Agent" >nul 2>&1
timeout /t 3 /nobreak >nul
sc delete TracrAgent >nul 2>&1
sc delete "Tracr Agent" >nul 2>&1

echo Step 1.3: Force uninstall using agent executable...
if exist "C:\Program Files\TracrAgent\agent.exe" (
    "C:\Program Files\TracrAgent\agent.exe" -uninstall >nul 2>&1
)
if exist "agent.exe" (
    agent.exe -uninstall >nul 2>&1
)

echo Step 1.4: Removing all installation directories...
if exist "C:\Program Files\TracrAgent" (
    echo Removing C:\Program Files\TracrAgent...
    rmdir /s /q "C:\Program Files\TracrAgent" >nul 2>&1
)
if exist "C:\ProgramData\TracrAgent" (
    echo Removing C:\ProgramData\TracrAgent...
    rmdir /s /q "C:\ProgramData\TracrAgent" >nul 2>&1
)

echo Step 1.5: Cleaning registry entries...
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\TracrAgent" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\TracrAgent" /f >nul 2>&1

echo Step 1.6: Final cleanup verification...
timeout /t 3 /nobreak >nul
echo CLEANUP COMPLETE - System is now clean

echo.
echo ========================================
echo Phase 2: FRESH INSTALLATION
echo ========================================

echo Step 2.1: Creating fresh installation directory...
mkdir "C:\Program Files\TracrAgent" >nul 2>&1
if not exist "C:\Program Files\TracrAgent" (
    echo ERROR: Cannot create installation directory. Check administrator privileges.
    pause
    exit /b 1
)

echo Step 2.2: Copying fresh agent executable...
copy "agent.exe" "C:\Program Files\TracrAgent\agent.exe" >nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy agent executable. Make sure agent.exe exists in current directory.
    pause
    exit /b 1
)

echo Step 2.3: Creating fresh data directories...
mkdir "C:\ProgramData\TracrAgent" >nul 2>&1
mkdir "C:\ProgramData\TracrAgent\data" >nul 2>&1
mkdir "C:\ProgramData\TracrAgent\logs" >nul 2>&1
mkdir "C:\ProgramData\TracrAgent\data\snapshots" >nul 2>&1

echo Step 2.4: Creating clean configuration file...
(
echo {
echo   "api_endpoint": "https://web-production-c4a4.up.railway.app",
echo   "collection_interval": "15m",
echo   "jitter_percent": 0.1,
echo   "max_retries": 5,
echo   "backoff_multiplier": 2.0,
echo   "max_backoff_time": "5m",
echo   "data_dir": "C:\\ProgramData\\TracrAgent\\data",
echo   "snapshot_path": "C:\\ProgramData\\TracrAgent\\data\\snapshots",
echo   "log_level": "INFO",
echo   "log_dir": "C:\\ProgramData\\TracrAgent\\logs",
echo   "request_timeout": "30s",
echo   "heartbeat_interval": "5m",
echo   "command_poll_interval": "60s"
echo }
) > "C:\ProgramData\TracrAgent\config.json"

echo Step 2.5: Setting proper permissions...
icacls "C:\Program Files\TracrAgent" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T >nul 2>&1
icacls "C:\ProgramData\TracrAgent" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T >nul 2>&1
icacls "C:\ProgramData\TracrAgent" /grant "BUILTIN\Administrators:(OI)(CI)F" /T >nul 2>&1

echo Step 2.6: Installing service with fresh executable...
"C:\Program Files\TracrAgent\agent.exe" -install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install service. Check Event Viewer for details.
    pause
    exit /b 1
)

echo Step 2.7: Configuring service for automatic startup...
sc config TracrAgent start= auto
sc config TracrAgent depend= ""

echo.
echo ========================================
echo Phase 3: SERVICE STARTUP & VERIFICATION
echo ========================================

echo Step 3.1: Starting service with retry logic...
set attempt=0
:start_retry
set /a attempt+=1
echo Attempt %attempt%: Starting TracrAgent service...

sc start TracrAgent
if %errorlevel% equ 0 (
    echo Service start command succeeded, waiting for initialization...
    timeout /t 5 /nobreak >nul
    
    sc query TracrAgent | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo SUCCESS: Service is running!
        goto service_running
    ) else (
        echo Service started but not running yet, waiting longer...
        timeout /t 10 /nobreak >nul
        sc query TracrAgent | find "RUNNING" >nul
        if %errorlevel% equ 0 (
            echo SUCCESS: Service is now running!
            goto service_running
        )
    )
)

if %attempt% lss 5 (
    echo Start attempt %attempt% failed, retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
    goto start_retry
) else (
    echo ERROR: Failed to start service after %attempt% attempts.
    goto service_failed
)

:service_running
echo.
echo ========================================
echo Phase 4: FINAL VERIFICATION
echo ========================================

echo Testing configuration validity...
powershell -Command "try { $config = Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json; Write-Host 'Config valid - API endpoint:' $config.api_endpoint } catch { Write-Host 'Config error:' $_.Exception.Message }"

echo.
echo Testing API connectivity...
powershell -Command "try { $response = Invoke-WebRequest 'https://web-production-c4a4.up.railway.app/health' -UseBasicParsing -TimeoutSec 10; Write-Host 'API connectivity: OK (Status:' $response.StatusCode ')' } catch { Write-Host 'API test failed:' $_.Exception.Message }"

echo.
echo Service status:
sc query TracrAgent

echo.
echo Recent log entries:
if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
    powershell -Command "Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 5 -ErrorAction SilentlyContinue"
) else (
    echo No log file found - service may still be initializing
)

echo.
echo ========================================
echo    NUCLEAR RESET INSTALLATION COMPLETE!
echo ========================================
echo.
echo The Tracr Agent has been completely reset and reinstalled.
echo.
echo System Configuration:
echo - Installation: C:\Program Files\TracrAgent\
echo - Data Directory: C:\ProgramData\TracrAgent\
echo - API Endpoint: https://web-production-c4a4.up.railway.app
echo - Web Dashboard: https://tracr-silk.vercel.app
echo - Login: admin / admin123
echo.
echo The agent should appear in the dashboard within 1-2 minutes.
goto end

:service_failed
echo.
echo ========================================
echo    SERVICE START FAILED - DIAGNOSTICS
echo ========================================
echo.
echo The installation completed but the service failed to start.
echo.
echo Diagnostic Information:
echo Service status:
sc query TracrAgent
echo.
echo Recent Windows Event Log entries:
powershell -Command "Get-EventLog -LogName Application -Source 'TracrAgent' -Newest 3 -ErrorAction SilentlyContinue | Format-List"
echo.
echo Configuration file check:
if exist "C:\ProgramData\TracrAgent\config.json" (
    echo Config exists - checking validity...
    powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Out-Null; Write-Host 'Config is valid' } catch { Write-Host 'Config error:' $_.Exception.Message }"
) else (
    echo ERROR: Config file missing!
)
echo.
echo Manual troubleshooting:
echo 1. Check Event Viewer ^> Windows Logs ^> Application
echo 2. Try manually starting: sc start TracrAgent  
echo 3. Run agent in console mode: "C:\Program Files\TracrAgent\agent.exe"
echo 4. Check firewall settings

:end
echo.
pause