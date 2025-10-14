@echo off
REM Build script for Tracr Agent MSI using WiX Toolset
REM Usage: build.bat [version]

setlocal enabledelayedexpansion

REM Set version from parameter or default
set VERSION=%1
if "%VERSION%"=="" set VERSION=1.0.0

echo Building Tracr Agent MSI version %VERSION%

REM Check for WiX Toolset
where candle.exe >nul 2>nul
if errorlevel 1 (
    echo Error: WiX Toolset not found in PATH
    echo Please install WiX Toolset and add it to PATH
    echo Download from: https://github.com/wixtoolset/wix3/releases
    exit /b 1
)

REM Check if agent binary exists
if not exist "..\build\agent.exe" (
    echo Error: Agent binary not found
    echo Please run "make build" first to compile the agent
    exit /b 1
)

REM Create config template if it doesn't exist
if not exist "config-template.json" (
    echo Creating config template...
    echo {> config-template.json
    echo   "api_endpoint": "https://your-api-server:8443",>> config-template.json
    echo   "collection_interval": "15m",>> config-template.json
    echo   "jitter_percent": 0.1,>> config-template.json
    echo   "max_retries": 5,>> config-template.json
    echo   "backoff_multiplier": 2.0,>> config-template.json
    echo   "max_backoff_time": "5m",>> config-template.json
    echo   "log_level": "INFO",>> config-template.json
    echo   "request_timeout": "30s",>> config-template.json
    echo   "heartbeat_interval": "5m",>> config-template.json
    echo   "command_poll_interval": "60s">> config-template.json
    echo }>> config-template.json
)

REM Create license file if it doesn't exist
if not exist "License.rtf" (
    echo Creating license template...
    echo {\rtf1\ansi\deff0 {\fonttbl {\f0 Times New Roman;}}> License.rtf
    echo \f0\fs24 Tracr Agent Software License Agreement\par\par>> License.rtf
    echo This software is provided under the terms of your organization's license agreement.\par>> License.rtf
    echo Please contact your administrator for license details.\par>> License.rtf
    echo }>> License.rtf
)

REM Clean previous build artifacts
echo Cleaning previous build artifacts...
del /f /q *.msi 2>nul
del /f /q *.wixobj 2>nul
del /f /q *.wixpdb 2>nul

REM Compile WiX source
echo Compiling WiX source...
candle.exe -dVersion=%VERSION% -out Product.wixobj Product.wxs
if errorlevel 1 (
    echo Error: Failed to compile WiX source
    exit /b 1
)

REM Link to create MSI
echo Linking MSI...
light.exe -ext WixUIExtension -out "TracrAgent-%VERSION%.msi" Product.wixobj
if errorlevel 1 (
    echo Error: Failed to link MSI
    exit /b 1
)

REM Sign MSI if certificate is available
if exist "%SIGNTOOL_CERT%" (
    echo Signing MSI...
    signtool.exe sign /f "%SIGNTOOL_CERT%" /p "%SIGNTOOL_PASS%" /t http://timestamp.digicert.com "TracrAgent-%VERSION%.msi"
    if errorlevel 1 (
        echo Warning: Failed to sign MSI
    ) else (
        echo MSI signed successfully
    )
) else (
    echo Note: Skipping code signing (certificate not configured)
    echo Set SIGNTOOL_CERT and SIGNTOOL_PASS environment variables for code signing
)

REM Clean intermediate files
del /f /q *.wixobj 2>nul
del /f /q *.wixpdb 2>nul

echo.
echo Build completed successfully!
echo Output: TracrAgent-%VERSION%.msi
echo.
echo Installation command (silent):
echo   msiexec /i TracrAgent-%VERSION%.msi /quiet
echo.
echo Installation command (interactive):
echo   msiexec /i TracrAgent-%VERSION%.msi
echo.

endlocal