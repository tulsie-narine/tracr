@echo off
echo Quick Fix for PowerShell Script Issues
echo ======================================
echo.

echo The issue you're experiencing is likely because you're using an older version
echo of the deployment package from your Downloads folder.
echo.

echo SOLUTION 1 - Use the clean script:
echo Run this command instead:
echo   powershell -ExecutionPolicy Bypass -File "deploy-to-railway-clean.ps1"
echo.

echo SOLUTION 2 - Manual configuration (if PowerShell fails):
echo 1. Open Command Prompt as Administrator
echo 2. Run these commands:
echo.
echo    sc stop TracrAgent
echo    sc start TracrAgent
echo    sc query TracrAgent
echo.

echo SOLUTION 3 - Check service manually:
echo 1. Open Windows Services (services.msc)
echo 2. Find "TracrAgent" service
echo 3. Right-click and select "Start" if stopped
echo 4. Check if it shows "Running" status
echo.

echo The agent should connect to: https://web-production-c4a4.up.railway.app
echo Check the web frontend: https://tracr-silk.vercel.app (admin/admin123)
echo.

pause