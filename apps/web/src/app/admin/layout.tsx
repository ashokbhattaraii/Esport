"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ViewportToggle } from "@/components/ViewportToggle";
import { PageLoading } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/tournaments", label: "Tournaments", icon: "🏆" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/results", label: "Results", icon: "📋" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "💸" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/banners", label: "Banners", icon: "🖼️" },
  { href: "/admin/config", label: "System Config", icon: "⚙️" },
  { href: "/admin/schedule", label: "Free Daily", icon: "📅" },
  { href: "/admin/roles", label: "Roles & Perms", icon: "🔐" },
  { href: "/admin/logs", label: "Audit Logs", icon: "📝" },
  { href: "/admin/bot", label: "Bot Control", icon: "🤖" },
  { href: "/admin/support", label: "Support", icon: "🎧" },
  { href: "/admin/app-releases", label: "App Releases", icon: "📱" },
  { href: "/admin/apk-test", label: "APK Testing", icon: "🧪" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <PageLoading label="Checking admin access..." />;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))
    return <p style={{ color: "var(--fs-red)" }}>Admin access required.</p>;

  const SidebarContent = () => (
    <>
      <div style={{ padding: "16px 12px", borderBottom: "1px solid var(--fs-border)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--fs-text-3)", textTransform: "uppercase" }}>
          Admin Panel
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fs-text-1)", marginTop: 4 }}>
          🔥 FireSlot Nepal
        </p>
      </div>

      <nav style={{ padding: "8px 6px", flex: 1, overflowY: "auto" }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: "none",
                background: active ? "rgba(229,57,53,0.12)" : "transparent",
                borderLeft: active ? "3px solid #E53935" : "3px solid transparent",
                color: active ? "#E53935" : "rgba(255,255,255,0.65)",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                transition: "all .15s",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px", borderTop: "1px solid var(--fs-border)" }}>
        <ViewportToggle />
        <Link
          href="/"
          style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--fs-text-3)", textDecoration: "none" }}
        >
          ← Back to App
        </Link>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", margin: "0 -16px" }}>
      {/* Desktop sidebar */}
      <aside
        style={{
          width: 230,
          flexShrink: 0,
          background: "var(--fs-surface-1)",
          borderRight: "1px solid var(--fs-border)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 56,
          height: "calc(100vh - 56px)",
          overflowY: "auto",
        }}
        className="hidden lg:flex"
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 250,
              background: "var(--fs-surface-1)",
              display: "flex",
              flexDirection: "column",
              zIndex: 61,
            }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: 16 }}>
        {/* Mobile top bar */}
        <div
          className="lg:hidden"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid var(--fs-border)",
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{ fontSize: 22, background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4, minWidth: 44, minHeight: 44 }}
          >
            ☰
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fs-text-1)" }}>Admin Panel</span>
        </div>

        {children}
      </main>
    </div>
  );
}
