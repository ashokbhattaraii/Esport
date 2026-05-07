"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Trophy, Wallet, Bell, UserCircle } from "lucide-react";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useUserRealtime } from "@/hooks/useUserRealtime";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/notifications", label: "Alerts", icon: Bell, key: "notif" },
  { href: "/dashboard", label: "Profile", icon: UserCircle },
];

export function MobileBottomNav() {
  const isNative = useIsNativeApp();
  const pathname = usePathname();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isNative || !user) return;
    api<any[]>("/notifications")
      .then((items) => setUnread(items.filter((n: any) => !n.read).length))
      .catch(() => {});
  }, [isNative, user, pathname]);

  useUserRealtime({
    onNotification: () => setUnread((n) => n + 1),
  });

  if (!isNative) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-border bg-bg/95 backdrop-blur"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        height: "calc(64px + env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] ${
              active ? "text-neon-cyan" : "text-white/55"
            }`}
          >
            <div className="relative">
              <Icon size={20} />
              {t.key === "notif" && unread > 0 && (
                <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-[9px] font-bold text-white text-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
