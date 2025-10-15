@echo off
echo Tracr Agent - System Tray Mode
echo ===============================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Not running as Administrator
    echo Some operations may require elevated privileges
    echo.
)

REM Check if agent.exe exists
if not exist "agent.exe" (
    echo ERROR: agent.exe not found in current directory
    echo.
    echo To build the unified agent:
    echo   1. Navigate to the agent source directory
    echo   2. Run: make build
    echo   3. Copy build/agent.exe to this directory
    echo.
    pause
    exit /b 1
)

echo Starting Tracr Agent with system tray...
echo Using unified agent.exe binary
echo.
echo Instructions:
echo - Look for Tracr icon in system tray (bottom-right corner)
echo - Right-click icon for menu options:
echo   * Status: Shows registration status
echo   * Force Check-In: Triggers immediate data collection
echo   * Open Logs: View log files
echo   * Open Config: Edit configuration
echo   * Quit: Stop agent and exit
echo.
echo - Agent status updates every 5 seconds
echo - Use Ctrl+C to stop (or Quit from tray menu)
echo.

REM Run the unified agent in tray mode
agent.exe -tray

echo.
echo Tracr Agent stopped.
pause