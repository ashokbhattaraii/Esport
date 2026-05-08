"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ViewportToggle } from "@/components/ViewportToggle";
import { PageLoading } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/config", label: "System Config" },
  { href: "/admin/schedule", label: "Free Daily Schedule" },
  { href: "/admin/roles", label: "Roles & Permissions" },
  { href: "/admin/logs", label: "Audit Logs" },
  { href: "/admin/bot", label: "Bot Control" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/app-releases", label: "App Releases" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return <PageLoading label="Checking admin access..." />;
  if (!user || user.role !== "ADMIN")
    return <p className="text-red-400">Admin access required.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit space-y-1">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">Admin Panel</p>
          <ViewportToggle />
        </div>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`block rounded-md px-3 py-2 text-sm hover:bg-surface hover:text-neon-cyan ${
              pathname === n.href ? "bg-surface text-neon-cyan" : ""
            }`}
          >
            {n.label}
          </Link>
        ))}
      </aside>
      <section>{children}</section>
    </div>
  );
}
