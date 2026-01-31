@echo off
echo.
echo ======================================
echo  Shipper Mobile App - Quick Start
echo ======================================
echo.

REM Check if in correct directory
if not exist "ShipperMobileApp" (
    echo ERROR: Please run this from the parent directory
    echo (where ShipperMobileApp folder exists)
    pause
    exit /b 1
)

cd ShipperMobileApp

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo.
echo ======================================
echo  Instructions:
echo ======================================
echo.
echo 1. Android Emulator / Physical Device must be running
echo    (Open Android Studio → Device Manager → Launch)
echo.
echo 2. Confirm backend URL in: src\services\api.js
echo    - Emulator: http://10.0.2.2:5000/api
echo    - Device: http://192.168.x.x:5000/api
echo.
echo 3. Press any key to start...
echo.
pause

echo Starting Metro Bundler...
start cmd /k "npm start"

timeout /t 3 /nobreak

echo.
echo Building app for Android...
echo (This will take 3-5 minutes on first run)
echo.

call npm run android

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed
    echo Try: npm run android:clean
    pause
    exit /b 1
)

echo.
echo ======================================
echo SUCCESS! App should be running now.
echo ======================================
echo.
pause
