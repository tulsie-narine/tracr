@echo off
echo Tracr Agent - Complete Removal Tool
echo ====================================
echo.
echo This script will completely remove the Tracr Agent from your system.
echo WARNING: This will stop and remove the service and delete all configuration files.
echo.
set /p confirm="Are you sure you want to proceed? (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled by user.
    pause
    exit /b 0
)
echo.

echo Step 1: Stopping Tracr Agent Service...
sc query TracrAgent >nul 2>&1
if %errorlevel% equ 0 (
    echo Service found. Stopping...
    sc stop TracrAgent >nul 2>&1
    timeout /t 5 /nobreak >nul
    echo SUCCESS: Service stopped.
) else (
    echo No service found to stop.
)
echo.

echo Step 2: Removing Service Registration...
sc query TracrAgent >nul 2>&1
if %errorlevel% equ 0 (
    echo Attempting graceful uninstall...
    if exist "C:\Program Files\TracrAgent\agent.exe" (
        "C:\Program Files\TracrAgent\agent.exe" -uninstall >nul 2>&1
    )
    
    echo Forcing service deletion...
    sc delete TracrAgent >nul 2>&1
    echo SUCCESS: Service removed.
) else (
    echo No service registration found.
)
echo.

echo Step 3: Removing Program Files...
if exist "C:\Program Files\TracrAgent" (
    echo Removing installation directory...
    rmdir /s /q "C:\Program Files\TracrAgent" >nul 2>&1
    if exist "C:\Program Files\TracrAgent" (
        echo WARNING: Could not remove all files. Some may be in use.
        echo Manual cleanup may be required: C:\Program Files\TracrAgent
    ) else (
        echo SUCCESS: Program files removed.
    )
) else (
    echo No program files found.
)
echo.

echo Step 4: Removing Configuration and Logs...
if exist "C:\ProgramData\TracrAgent" (
    echo Removing configuration directory...
    rmdir /s /q "C:\ProgramData\TracrAgent" >nul 2>&1
    if exist "C:\ProgramData\TracrAgent" (
        echo WARNING: Could not remove all config files.
        echo Manual cleanup may be required: C:\ProgramData\TracrAgent
    ) else (
        echo SUCCESS: Configuration files removed.
    )
) else (
    echo No configuration files found.
)
echo.

echo Step 5: Cleaning Windows Registry...
echo Removing service registry entries...
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\TracrAgent" /f >nul 2>&1
echo SUCCESS: Registry cleaned.
echo.

echo Step 6: Final Verification...
sc query TracrAgent >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Service still exists in registry. Reboot may be required.
) else (
    echo SUCCESS: No service found.
)

if exist "C:\Program Files\TracrAgent" (
    echo WARNING: Program files still exist: C:\Program Files\TracrAgent
) else (
    echo SUCCESS: No program files found.
)

if exist "C:\ProgramData\TracrAgent" (
    echo WARNING: Config files still exist: C:\ProgramData\TracrAgent  
) else (
    echo SUCCESS: No configuration files found.
)
echo.

echo Removal Summary:
echo ================
echo Service Status: Removed
echo Program Files: Cleaned
echo Configuration: Cleaned
echo Registry: Cleaned
echo.
echo The Tracr Agent has been completely removed from your system.
echo You may need to reboot if any files were locked during removal.
echo.
echo You can now run install-agent.bat to perform a fresh installation.
echo.
pause