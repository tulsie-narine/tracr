@echo off
echo Tracr Agent - Enhanced Service Startup
echo =====================================
echo.

echo Stopping any existing service instance...
sc stop TracrAgent >nul 2>&1
timeout /t 5 /nobreak >nul

echo Checking for BOM issues in config file...
powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Out-Null; Write-Host 'Config file is valid' } catch { Write-Host 'Config file has issues, recreating...'; $config = @{'api_endpoint' = 'https://web-production-c4a4.up.railway.app'; 'collection_interval' = '15m'; 'jitter_percent' = 0.1; 'max_retries' = 5; 'backoff_multiplier' = 2.0; 'max_backoff_time' = '5m'; 'data_dir' = 'C:\ProgramData\TracrAgent\data'; 'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'; 'log_level' = 'INFO'; 'log_dir' = 'C:\ProgramData\TracrAgent\logs'; 'request_timeout' = '30s'; 'heartbeat_interval' = '5m'; 'command_poll_interval' = '60s'}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline; Write-Host 'Config recreated successfully' }"

echo.
echo Starting service with retry logic...
set retry_count=0

:retry_start
set /a retry_count+=1
echo.
echo === Attempt %retry_count% ===
sc start TracrAgent

if %errorlevel% equ 0 (
    echo Service start command succeeded, waiting for initialization...
    timeout /t 3 /nobreak >nul
    
    echo Checking if service is actually running...
    sc query TracrAgent | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo SUCCESS: Service is running!
        goto success
    ) else (
        echo Service started but not yet running, waiting longer...
        timeout /t 5 /nobreak >nul
        sc query TracrAgent | find "RUNNING" >nul
        if %errorlevel% equ 0 (
            echo SUCCESS: Service is now running!
            goto success
        ) else (
            echo Service still not running after extended wait.
        )
    )
) else (
    echo Service start command failed.
)

if %retry_count% lss 5 (
    echo Waiting before retry...
    timeout /t 3 /nobreak >nul
    goto retry_start
) else (
    echo.
    echo ERROR: Failed to start service after %retry_count% attempts.
    echo.
    echo Checking Windows Event Log for errors...
    echo Recent TracrAgent events:
    powershell -Command "Get-EventLog -LogName Application -Source 'TracrAgent' -Newest 5 -ErrorAction SilentlyContinue | Format-Table TimeGenerated, EntryType, Message -Wrap"
    echo.
    echo Troubleshooting steps:
    echo 1. Check Event Viewer for detailed error messages
    echo 2. Verify config file: C:\ProgramData\TracrAgent\config.json
    echo 3. Check permissions on directories
    echo 4. Try running: troubleshoot-service.bat
    goto end
)

:success
echo.
echo === Service Successfully Started! ===
echo.
echo Running quick verification...
timeout /t 2 /nobreak >nul
powershell -ExecutionPolicy Bypass -File "verify-railway-connection-clean.ps1"

:end
echo.
pause