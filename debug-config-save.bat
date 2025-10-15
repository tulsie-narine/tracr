@echo off
echo === Tracr Agent Config Debug ===
echo.

echo Checking config directory permissions...
if not exist "C:\ProgramData\TracrAgent" (
    echo Creating TracrAgent directory...
    mkdir "C:\ProgramData\TracrAgent" 2>nul
    if errorlevel 1 (
        echo ERROR: Cannot create C:\ProgramData\TracrAgent - Permission denied
        echo Try running as Administrator
        pause
        exit /b 1
    )
)

echo Checking write permissions...
echo test > "C:\ProgramData\TracrAgent\write-test.txt" 2>nul
if errorlevel 1 (
    echo ERROR: Cannot write to C:\ProgramData\TracrAgent - Permission denied
    echo Try running as Administrator
    pause
    exit /b 1
) else (
    del "C:\ProgramData\TracrAgent\write-test.txt" 2>nul
    echo SUCCESS: Write permissions OK
)

echo.
echo Checking current config file...
if exist "C:\ProgramData\TracrAgent\config.json" (
    echo Config file exists:
    type "C:\ProgramData\TracrAgent\config.json"
) else (
    echo No config file found
)

echo.
echo Config debug complete. Press any key to exit...
pause >nul