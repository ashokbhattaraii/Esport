#!/bin/bash
set -e

echo "=== FireSlot Nepal APK Build ==="

# Step 1: Clean previous build
rm -rf apps/web/out
echo "✓ Cleaned old build"

# Step 2: Build with capacitor flag
cd apps/web
BUILD_TARGET=capacitor NEXT_PUBLIC_APP_URL=https://fireslot.vercel.app pnpm build
echo "✓ Next.js static build complete"

# Step 3: Sync to Android
npx cap sync android
echo "✓ Capacitor synced"

# Step 4: Build APK
cd android
./gradlew assembleRelease
echo "✓ APK built"

# Step 5: Copy APK
APK="app/build/outputs/apk/release/app-release-unsigned.apk"
mkdir -p ../../public/downloads
cp $APK ../../public/downloads/fireslot-nepal.apk
echo "✓ APK copied to public/downloads/fireslot-nepal.apk"
echo "=== Build complete ==="
  cat android/app/src/main/assets/capacitor.config.json
  exit 1
fi

echo "Building APK..."
cd android
APP_VERSION_NAME="$VERSION_NAME" APP_VERSION_CODE="$VERSION_CODE" ./gradlew assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
mkdir -p "$REPO_ROOT/apps/api/public/downloads" "$REPO_ROOT/public/downloads"
cp "$APK_PATH" "$REPO_ROOT/apps/api/public/downloads/fireslot-nepal.apk"
cp "$APK_PATH" "$REPO_ROOT/public/downloads/fireslot-nepal.apk"
echo "APK copied to apps/api/public/downloads/fireslot-nepal.apk and public/downloads/fireslot-nepal.apk"
echo "Build complete."
