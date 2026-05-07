"use client";
import { useEffect } from "react";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NativeBootstrap() {
  const isNative = useIsNativeApp();
  // Hooks must be called unconditionally; the hook itself no-ops on web.
  usePushNotifications();

  useEffect(() => {
    if (!isNative) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0f0f0f" });
      } catch { /* ignore */ }
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch { /* ignore */ }
    })();
  }, [isNative]);

  return null;
}
