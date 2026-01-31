#!/bin/bash

echo "======================================"
echo " Shipper Mobile App - Quick Start"
echo "======================================"
echo ""

# Check if in correct directory
if [ ! -d "ShipperMobileApp" ]; then
    echo "ERROR: Please run this from the parent directory"
    echo "(where ShipperMobileApp folder exists)"
    exit 1
fi

cd ShipperMobileApp

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: npm install failed"
        exit 1
    fi
fi

echo ""
echo "======================================"
echo " Instructions:"
echo "======================================"
echo ""
echo "1. Android Emulator / Physical Device must be running"
echo "   (Open Android Studio → Device Manager → Launch)"
echo ""
echo "2. Confirm backend URL in: src/services/api.js"
echo "   - Emulator: http://10.0.2.2:5000/api"
echo "   - Device: http://192.168.x.x:5000/api"
echo ""
echo "3. Press Enter to start..."
echo ""
read

echo "Starting Metro Bundler..."
npm start &

sleep 3

echo ""
echo "Building app for Android..."
echo "(This will take 3-5 minutes on first run)"
echo ""

npm run android

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed"
    echo "Try: npm run android:clean"
    exit 1
fi

echo ""
echo "======================================"
echo "SUCCESS! App should be running now."
echo "======================================"
echo ""
