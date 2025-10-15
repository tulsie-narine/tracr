@echo off
echo Tracr Agent - Service Troubleshooting
echo ======================================
echo.

echo Checking service startup issues...
echo.

echo 1. Service Status:
sc query TracrAgent
echo.

echo 2. Recent Windows Event Log entries for TracrAgent:
powershell -Command "Get-EventLog -LogName Application -Source 'TracrAgent' -Newest 5 -ErrorAction SilentlyContinue | Format-Table TimeGenerated, EntryType, Message -Wrap"
echo.

echo 3. Configuration File Check:
if exist "C:\ProgramData\TracrAgent\config.json" (
    echo Configuration file exists:
    type "C:\ProgramData\TracrAgent\config.json"
    echo.
    echo Validating JSON format...
    powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' | ConvertFrom-Json | Out-Null; Write-Host '[OK] Configuration file is valid JSON' } catch { Write-Host '[ERROR] Invalid JSON in configuration file:' $_.Exception.Message }"
) else (
    echo [ERROR] Configuration file not found at: C:\ProgramData\TracrAgent\config.json
)
echo.

echo 4. Directory Permissions:
echo Checking if TracrAgent directories exist and are accessible...
if exist "C:\ProgramData\TracrAgent" (
    echo [OK] C:\ProgramData\TracrAgent exists
) else (
    echo [ERROR] C:\ProgramData\TracrAgent missing
)

if exist "C:\ProgramData\TracrAgent\data" (
    echo [OK] C:\ProgramData\TracrAgent\data exists
) else (
    echo [ERROR] C:\ProgramData\TracrAgent\data missing
)

if exist "C:\ProgramData\TracrAgent\logs" (
    echo [OK] C:\ProgramData\TracrAgent\logs exists
) else (
    echo [ERROR] C:\ProgramData\TracrAgent\logs missing
)
echo.

echo 5. Manual Service Start Test:
echo Attempting to start service manually...
sc start TracrAgent
if %errorlevel% equ 0 (
    echo [OK] Service started successfully
    timeout /t 3 /nobreak >nul
    sc query TracrAgent
) else (
    echo [ERROR] Service failed to start - Error code: %errorlevel%
    echo.
    echo Common solutions:
    echo - Run as Administrator
    echo - Check antivirus software blocking the service
    echo - Verify all directories exist with proper permissions
    echo - Check Windows Event Log for detailed error messages
)
echo.

echo 6. Log File Analysis:
if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
    echo Recent log entries:
    powershell -Command "Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 20"
) else (
    echo No log file found - service may not have started successfully
)
echo.

echo 7. Network Connectivity Test:
echo Testing connection to Railway API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://web-production-c4a4.up.railway.app/health' -UseBasicParsing -TimeoutSec 10; Write-Host '[OK] API reachable - Status:' $response.StatusCode } catch { Write-Host '[WARNING] Cannot reach API:' $_.Exception.Message }"
echo.

echo Troubleshooting complete. 
echo If the service still fails to start, check Windows Event Viewer:
echo 1. Open Event Viewer (eventvwr.msc)
echo 2. Go to Windows Logs ^> Application
echo 3. Look for TracrAgent entries with Error level
echo.
pause