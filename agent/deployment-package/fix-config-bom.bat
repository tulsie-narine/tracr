@echo off
echo Tracr Agent - Configuration File Fix
echo ====================================
echo.

echo The problem is a UTF-8 BOM in the config.json file that prevents JSON parsing.
echo This script will create a clean config file without BOM.
echo.

echo Stopping service...
sc stop TracrAgent >nul 2>&1

echo Creating clean configuration file...
powershell -Command "$config = @{
    'api_endpoint' = 'https://web-production-c4a4.up.railway.app'
    'collection_interval' = '15m'
    'jitter_percent' = 0.1
    'max_retries' = 5
    'backoff_multiplier' = 2.0
    'max_backoff_time' = '5m'
    'data_dir' = 'C:\ProgramData\TracrAgent\data'
    'snapshot_path' = 'C:\ProgramData\TracrAgent\data\snapshots'
    'log_level' = 'INFO'
    'log_dir' = 'C:\ProgramData\TracrAgent\logs'
    'request_timeout' = '30s'
    'heartbeat_interval' = '5m'
    'command_poll_interval' = '60s'
}; $config | ConvertTo-Json | Out-File -FilePath 'C:\ProgramData\TracrAgent\config.json' -Encoding UTF8 -NoNewline"

echo SUCCESS: Clean configuration file created without BOM.
echo.

echo Testing configuration...
powershell -Command "try { Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json | Out-Null; Write-Host '[OK] Configuration is valid JSON' -ForegroundColor Green } catch { Write-Host '[ERROR] Invalid JSON:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo Starting service...
sc start TracrAgent
if %errorlevel% equ 0 (
    echo SUCCESS: Service started successfully!
    timeout /t 3 /nobreak >nul
    sc query TracrAgent
    echo.
    echo The agent should now connect to Railway API successfully.
    echo Check the web frontend: https://tracr-silk.vercel.app (admin/admin123)
) else (
    echo FAILED: Service still failed to start.
    echo Check the log file for new errors:
    if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
        powershell -Command "Get-Content 'C:\ProgramData\TracrAgent\logs\agent.log' -Tail 5"
    )
)
echo.
pause