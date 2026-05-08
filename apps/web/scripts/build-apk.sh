#!/bin/bash
set -e
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$WEB_DIR/../.." && pwd)"
API_URL="${NEXT_PUBLIC_API_URL:-https://esport-api-steel.vercel.app/api}"
WEB_URL="${NEXT_PUBLIC_APP_URL:-https://esport-web-rho.vercel.app}"
VERSION_NAME="${APP_VERSION_NAME:-1.0.0}"
VERSION_CODE="${APP_VERSION_CODE:-1}"

if [ -z "${JAVA_HOME:-}" ] && [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
fi

cd "$WEB_DIR"
echo "Removing stale APKs from bundled web assets..."
rm -f public/downloads/*.apk out/downloads/*.apk android/app/src/main/assets/public/downloads/*.apk 2>/dev/null || true

echo "Building Next.js static export..."
CAPACITOR_BUILD=true \
NEXT_PUBLIC_IS_NATIVE=true \
NEXT_PUBLIC_API_URL="$API_URL" \
NEXT_PUBLIC_APP_URL="$WEB_URL" \
pnpm build

echo "Syncing Capacitor..."
pnpm exec cap sync android
rm -f android/app/src/main/assets/public/downloads/*.apk 2>/dev/null || true

if grep -q '"url"' android/app/src/main/assets/capacitor.config.json; then
  echo "Refusing to build: capacitor.config.json still contains server.url"
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
