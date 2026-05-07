"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Bell,
  Flame,
  Home,
  LifeBuoy,
  LogOut,
  Shield,
  Swords,
  Trophy,
  UserCircle,
  Wallet,
} from "lucide-react";
import { ViewportToggle } from "./ViewportToggle";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const nav = [
    { href: "/", label: "Home", icon: Home },
    { href: "/tournaments", label: "Matches", icon: Trophy },
    { href: "/challenges", label: "Fight", icon: Swords },
    { href: user ? "/wallet" : "/login", label: "Wallet", icon: Wallet },
    {
      href: user ? "/dashboard" : "/login",
      label: "Profile",
      icon: UserCircle,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-base text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon/15 text-neon">
              <Flame size={20} />
            </span>
            FireSlot
          </Link>
          <div className="flex items-center gap-2">
            <ViewportToggle compact />
            {user ? (
              <>
                <Link
                  href="/notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                </Link>
                <Link
                  href="/support"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface"
                  aria-label="Support"
                  title="Support"
                >
                  <LifeBuoy size={17} />
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-orange/40 bg-neon-orange/10 text-neon-orange"
                    aria-label="Admin"
                  >
                    <Shield size={17} />
                  </Link>
                )}
                <NavAvatar src={user.avatarUrl} />
                <button
                  onClick={logout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface"
                  aria-label="Logout"
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-primary px-3 py-2 text-xs">
                Google
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 grid-cols-5 border-t border-border bg-bg/95 px-2 pb-3 pt-2 backdrop-blur">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
                active ? "bg-surface text-neon-cyan" : "text-white/55"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavAvatar({ src }: { src?: string | null }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  return (
    <img
      src={src}
      alt=""
      onError={() => setBad(true)}
      className="h-9 w-9 rounded-lg border border-border object-cover"
    />
  );
}
