#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "Building Next.js static export..."
CAPACITOR_BUILD=true pnpm build
echo "Syncing Capacitor..."
pnpm exec cap sync android
echo "Building APK..."
cd android
./gradlew assembleRelease
APK_PATH="app/build/outputs/apk/release/app-release.apk"
mkdir -p ../public/downloads
cp "$APK_PATH" ../public/downloads/fireslot-nepal.apk
echo "APK copied to public/downloads/fireslot-nepal.apk"
echo "Build complete."
