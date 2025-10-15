@echo off
echo Tracr Agent - Service Fix and Test
echo ===================================
echo.

echo This script will fix common service startup issues and test the agent manually.
echo.
pause

echo Step 1: Creating missing directories...
if not exist "C:\ProgramData\TracrAgent\data\snapshots" (
    mkdir "C:\ProgramData\TracrAgent\data\snapshots"
    echo Created: C:\ProgramData\TracrAgent\data\snapshots
)

if not exist "C:\ProgramData\TracrAgent\logs" (
    mkdir "C:\ProgramData\TracrAgent\logs"
    echo Created: C:\ProgramData\TracrAgent\logs
)
echo.

echo Step 2: Creating proper configuration file...
echo Creating config.json without BOM (this was the main problem)...
powershell -Command "$config = @{'api_endpoint' = 'https://web-production-c4a4.up.railway.app'; 'collection_interval' = '15m'; 'jitter_percent' = 0.1; 'max_retries' = 5; 'backoff_multiplier' = 2.0; 'max_backoff_time' = '5m'; 'data_dir' = 'C:\ProgramData\TracrAgent\data'; 'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'; 'log_level' = 'INFO'; 'log_dir' = 'C:\ProgramData\TracrAgent\logs'; 'request_timeout' = '30s'; 'heartbeat_interval' = '5m'; 'command_poll_interval' = '60s'}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline"
echo SUCCESS: Configuration file created without BOM.
echo.

echo Step 3: Testing agent executable directly...
echo Running agent in console mode to check for errors...
echo (Press Ctrl+C to stop when you see it running)
echo.
timeout /t 2 /nobreak >nul
echo Starting agent console test...
echo If you see error messages, that's the problem. Press Ctrl+C to continue.
echo.
"C:\Program Files\TracrAgent\agent.exe"
echo.
echo Agent console test completed.
echo.

echo Step 4: Attempting service start...
sc stop TracrAgent >nul 2>&1
timeout /t 2 /nobreak >nul
sc start TracrAgent
if %errorlevel% equ 0 (
    echo SUCCESS: Service started successfully!
    timeout /t 3 /nobreak >nul
    sc query TracrAgent
) else (
    echo FAILED: Service failed to start. Checking logs...
    if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
        echo.
        echo Recent log entries:
        powershell -Command "Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 10"
    ) else (
        echo No log file found - agent may not have started at all.
    )
)
echo.

echo Step 5: Network connectivity test...
echo Testing connection to Railway API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://web-production-c4a4.up.railway.app/health' -UseBasicParsing -TimeoutSec 10; Write-Host 'SUCCESS: API reachable - Status:' $response.StatusCode } catch { Write-Host 'WARNING: Cannot reach API:' $_.Exception.Message }"
echo.

echo Fix attempt completed!
echo ======================
echo.
echo If the service is running, check the web frontend:
echo 1. Go to: https://tracr-silk.vercel.app
echo 2. Login: admin / admin123
echo 3. Check the Devices page for this machine
echo.
echo If issues persist, check Windows Event Viewer:
echo 1. Open Event Viewer (eventvwr.msc)
echo 2. Go to Windows Logs ^> Application
echo 3. Look for TracrAgent entries
echo.
pause