"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ViewportToggle } from "@/components/ViewportToggle";
import { PageLoading } from "@/components/ui";
import {
  LayoutDashboard, Trophy, CreditCard, BarChart3, Users, Image,
  Settings, Calendar, Shield, FileText, Bot, HeadphonesIcon,
  Smartphone, TestTube, Menu, X, Wallet,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/config", label: "System Config", icon: Settings },
  { href: "/admin/schedule", label: "Free Daily Schedule", icon: Calendar },
  { href: "/admin/roles", label: "Roles & Permissions", icon: Shield },
  { href: "/admin/logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/bot", label: "Bot Control", icon: Bot },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
  { href: "/admin/app-releases", label: "App Releases", icon: Smartphone },
  { href: "/admin/apk-test", label: "APK Testing", icon: TestTube },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <PageLoading label="Checking admin access..." />;
  if (!user || user.role !== "ADMIN")
    return <p style={{ color: 'var(--fs-red)' }}>Admin access required.</p>;

  const sidebar = (
    <div className="space-y-1">
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition"
            style={{
              background: active ? 'var(--fs-surface-2)' : 'transparent',
              color: active ? 'var(--fs-red)' : 'var(--fs-text-2)',
              borderLeft: active ? '3px solid var(--fs-red)' : '3px solid transparent',
            }}
          >
            <Icon size={16} />
            {n.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block h-fit sticky top-20 rounded-xl p-3 space-y-3"
        style={{ background: 'var(--fs-surface-1)', border: '0.5px solid var(--fs-border)' }}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-bold uppercase" style={{ color: 'var(--fs-text-3)' }}>Admin Panel</span>
          <ViewportToggle />
        </div>
        {sidebar}
      </aside>

      {/* Mobile header + drawer */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-30 flex items-center justify-between px-4 py-2"
        style={{ background: 'var(--fs-bg)', borderBottom: '0.5px solid var(--fs-border)' }}
      >
        <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2" style={{ color: 'var(--fs-text-1)' }}>
          <Menu size={20} />
          <span className="text-sm font-semibold">Admin Panel</span>
        </button>
        <ViewportToggle />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setSidebarOpen(false)} />
          <div
            className="absolute top-0 left-0 bottom-0 w-64 p-4 overflow-y-auto"
            style={{ background: 'var(--fs-surface-1)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold" style={{ color: 'var(--fs-text-1)' }}>Admin Panel</span>
              <button onClick={() => setSidebarOpen(false)} style={{ color: 'var(--fs-text-3)' }}>
                <X size={20} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <section className="lg:col-start-2 pt-12 lg:pt-0">{children}</section>
    </div>
  );
}
