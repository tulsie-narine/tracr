@echo off
echo Creating Clean Config File (No BOM)
echo ====================================

rem Stop service first
sc stop TracrAgent >nul 2>&1
timeout /t 2 /nobreak >nul

rem Force delete existing config
del /f /q "C:\ProgramData\TracrAgent\config.json" >nul 2>&1
timeout /t 1 /nobreak >nul

echo Creating clean JSON config using native Windows methods...

rem Create config without any encoding issues
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

echo Config file created. Testing validity...
powershell -Command "try { $config = Get-Content 'C:\ProgramData\TracrAgent\config.json' -Raw | ConvertFrom-Json; Write-Host 'SUCCESS: Config is valid JSON'; Write-Host 'API Endpoint:' $config.api_endpoint } catch { Write-Host 'ERROR: Config is invalid:' $_.Exception.Message; exit 1 }"

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Clean config file created successfully!
    echo File location: C:\ProgramData\TracrAgent\config.json
    echo.
    echo You can now try starting the service:
    echo   sc start TracrAgent
    echo.
    echo Or run force-start-agent.bat for aggressive startup
) else (
    echo.
    echo ERROR: Config file creation failed.
    echo Please check permissions and try again.
)

pause