@echo off
echo Tracr Agent - Force Service Start
echo ==================================
echo This script will forcefully start the agent service using multiple methods.
echo.

echo Step 1: Complete service reset...
sc stop TracrAgent >nul 2>&1
sc delete TracrAgent >nul 2>&1
timeout /t 3 /nobreak >nul

echo Step 2: Reinstalling service...
"C:\Program Files\TracrAgent\agent.exe" uninstall >nul 2>&1
"C:\Program Files\TracrAgent\agent.exe" install
if %errorlevel% neq 0 (
    echo ERROR: Failed to reinstall service
    pause
    exit /b 1
)

echo Step 3: Force clean config creation...
rem Stop any processes that might lock the file
taskkill /f /im agent.exe >nul 2>&1

rem Delete config with force
del /f /q "C:\ProgramData\TracrAgent\config.json" >nul 2>&1
timeout /t 1 /nobreak >nul

rem Create config using a different method to avoid BOM
echo Creating absolutely clean config...
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

echo Step 4: Setting proper permissions...
icacls "C:\ProgramData\TracrAgent" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /T >nul 2>&1
icacls "C:\ProgramData\TracrAgent" /grant "BUILTIN\Administrators:(OI)(CI)F" /T >nul 2>&1

echo Step 5: Force service startup with aggressive retry...
set max_attempts=10
set attempt=0

:force_start_loop
set /a attempt+=1
echo.
echo === FORCE START ATTEMPT %attempt% ===

rem Multiple start methods
echo Method 1: Standard service start...
sc start TracrAgent >nul 2>&1

echo Method 2: Direct executable start (background)...
start /b "" "C:\Program Files\TracrAgent\agent.exe" >nul 2>&1

echo Method 3: Service control manager reset...
sc config TracrAgent start= auto >nul 2>&1
sc start TracrAgent >nul 2>&1

echo Waiting for initialization...
timeout /t 5 /nobreak >nul

echo Checking service status...
sc query TracrAgent | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo *** SUCCESS: Service is running! ***
    goto verify_running
)

echo Checking if process is running directly...
tasklist | find "agent.exe" >nul
if %errorlevel% equ 0 (
    echo *** SUCCESS: Agent process is running! ***
    goto verify_running
)

if %attempt% lss %max_attempts% (
    echo Attempt %attempt% failed, trying again...
    timeout /t 2 /nobreak >nul
    goto force_start_loop
)

echo.
echo *** CRITICAL ERROR: Unable to start agent after %max_attempts% attempts ***
echo.
echo Detailed diagnostics:
sc query TracrAgent
echo.
echo Process list check:
tasklist | find "agent"
echo.
echo Recent errors from Event Log:
powershell -Command "Get-EventLog -LogName Application -Source 'TracrAgent' -Newest 3 -ErrorAction SilentlyContinue | Format-List"
echo.
echo Config file check:
type "C:\ProgramData\TracrAgent\config.json"
goto end

:verify_running
echo.
echo === VERIFICATION ===
echo Service status:
sc query TracrAgent
echo.
echo Process status:
tasklist | find "agent.exe"
echo.
echo Testing config file:
powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Select api_endpoint, log_level } catch { Write-Host 'Config error: ' $_.Exception.Message }"
echo.
echo Recent log entries:
if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
    powershell -Command "Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 3"
) else (
    echo No log file found yet - service may still be starting
)

echo.
echo === SERVICE FORCE START COMPLETE ===
echo The agent should now be running. 
echo Check the Vercel dashboard at: https://tracr-silk.vercel.app
echo.

:end
pause