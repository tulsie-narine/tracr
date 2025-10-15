@echo off
echo Tracr Agent - Installation Verification
echo ========================================
echo.

echo Checking installation status...
echo.

echo 1. Agent Executable:
if exist "C:\Program Files\TracrAgent\agent.exe" (
    echo    [OK] Found at: C:\Program Files\TracrAgent\agent.exe
    for %%i in ("C:\Program Files\TracrAgent\agent.exe") do echo    Size: %%~zi bytes
) else (
    echo    [ERROR] Not found at: C:\Program Files\TracrAgent\agent.exe
)
echo.

echo 2. Agent Service:
sc query TracrAgent >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Service registered
    for /f "tokens=3" %%i in ('sc query TracrAgent ^| findstr STATE') do echo    Status: %%i
) else (
    echo    [ERROR] Service not found
)
echo.

echo 3. Configuration Directory:
if exist "C:\ProgramData\TracrAgent" (
    echo    [OK] Config directory exists: C:\ProgramData\TracrAgent
    if exist "C:\ProgramData\TracrAgent\config.json" (
        echo    [OK] Configuration file found
    ) else (
        echo    [WARNING] No configuration file found
    )
) else (
    echo    [WARNING] Config directory not found
)
echo.

echo 4. Log Directory:
if exist "C:\ProgramData\TracrAgent\logs" (
    echo    [OK] Log directory exists
    if exist "C:\ProgramData\TracrAgent\logs\agent.log" (
        echo    [OK] Log file found
        for %%i in ("C:\ProgramData\TracrAgent\logs\agent.log") do echo    Log size: %%~zi bytes
    ) else (
        echo    [INFO] No log file found (normal for new installation)
    )
) else (
    echo    [INFO] Log directory not found (will be created on first run)
)
echo.

echo 5. Network Test:
echo    Testing connection to Railway API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://web-production-c4a4.up.railway.app/health' -UseBasicParsing -TimeoutSec 10; Write-Host '   [OK] API reachable - Status:' $response.StatusCode } catch { Write-Host '   [WARNING] Cannot reach API:' $_.Exception.Message }"
echo.

echo Installation Summary:
echo =====================
if exist "C:\Program Files\TracrAgent\agent.exe" (
    if exist "C:\ProgramData\TracrAgent" (
        sc query TracrAgent >nul 2>&1
        if %errorlevel% equ 0 (
            echo Status: INSTALLATION COMPLETE
            echo.
            echo The Tracr Agent is installed and ready.
            echo Check the web frontend: https://tracr-silk.vercel.app
            echo Login: admin / admin123
        ) else (
            echo Status: INSTALLATION INCOMPLETE - Service not registered
        )
    ) else (
        echo Status: INSTALLATION INCOMPLETE - Missing configuration
    )
) else (
    echo Status: INSTALLATION FAILED - Agent executable not found
)
echo.
pause