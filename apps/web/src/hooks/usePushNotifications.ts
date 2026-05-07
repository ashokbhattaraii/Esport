"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsNativeApp } from "./useIsNativeApp";
import { api } from "@/lib/api";

interface State {
  isRegistered: boolean;
  token: string | null;
}

export function usePushNotifications() {
  const isNative = useIsNativeApp();
  const router = useRouter();
  const [state, setState] = useState<State>({ isRegistered: false, token: null });

  async function requestPermission() {
    if (!isNative) return;
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return;
      await PushNotifications.register();
    } catch (e) {
      console.warn("Push permission failed", e);
    }
  }

  useEffect(() => {
    if (!isNative) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        const perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== "granted") return;
        }
        await PushNotifications.register();

        const regHandle = await PushNotifications.addListener("registration", async (t) => {
          setState({ isRegistered: true, token: t.value });
          try {
            await api("/users/push-token", {
              method: "POST",
              body: JSON.stringify({ token: t.value, platform: "android" }),
            });
          } catch (e) {
            console.warn("Push token save failed", e);
          }
        });

        const errHandle = await PushNotifications.addListener("registrationError", (e) => {
          console.warn("Push registration error", e);
        });

        const recvHandle = await PushNotifications.addListener("pushNotificationReceived", async (n) => {
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 100000),
                  title: n.title ?? "FireSlot",
                  body: n.body ?? "",
                  extra: n.data,
                },
              ],
            });
          } catch (e) {
            console.warn("Local notification fallback failed", e);
          }
        });

        const tapHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const data = a.notification.data ?? {};
          const route = routeFor(data);
          if (route) router.push(route);
        });

        cleanup = () => {
          regHandle.remove();
          errHandle.remove();
          recvHandle.remove();
          tapHandle.remove();
        };
      } catch (e) {
        console.warn("Push setup failed", e);
      }
    })();

    return () => cleanup?.();
  }, [isNative, router]);

  return { ...state, requestPermission };
}

function routeFor(data: any): string | null {
  switch (data?.type) {
    case "PAYMENT_APPROVED": return "/tournaments";
    case "PRIZE_CREDITED":   return "/wallet";
    case "ROOM_DETAILS":     return data.tournamentId ? `/tournaments/${data.tournamentId}` : "/tournaments";
    case "SUPPORT_REPLY":    return "/support";
    default: return null;
  }
}
