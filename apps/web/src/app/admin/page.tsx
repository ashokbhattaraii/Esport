"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, Bell, ShieldCheck, Trophy, Users } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { PageLoading } from "@/components/ui";

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api("/admin/stats")
      .then(setStats)
      .catch((e: any) => setErr(e.message ?? "Could not load admin stats"));
  }, []);

  if (err) return <p className="text-red-400">{err}</p>;
  if (!stats) return <PageLoading label="Loading admin overview..." />;

  const queue = [
    {
      label: "Payments",
      value: stats.pendingPayments,
      href: "/admin/payments",
    },
    {
      label: "Withdrawals",
      value: stats.pendingWithdrawals,
      href: "/admin/withdrawals",
    },
    { label: "Results", value: stats.pendingResults, href: "/admin/results" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="label">Admin Command Center</p>
          <h1 className="font-display text-3xl neon-text">
            Operations Overview
          </h1>
        </div>
        <Link href="/admin/tournaments" className="btn-primary">
          Create Tournament
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat
          icon={<Users size={18} />}
          label="Users"
          value={stats.users}
          detail={`${stats.admins} admins · ${stats.bannedUsers} banned`}
        />
        <Stat
          icon={<Trophy size={18} />}
          label="Tournaments"
          value={stats.tournaments}
          detail={`${stats.liveTournaments} live · ${stats.upcomingTournaments} upcoming`}
        />
        <Stat
          icon={<Bell size={18} />}
          label="Queue"
          value={queue.reduce((sum, item) => sum + item.value, 0)}
          detail="Needs review"
          accent
        />
        <Stat
          icon={<Banknote size={18} />}
          label="Revenue"
          value={npr(stats.approvedRevenueNpr)}
          detail="Approved payments"
        />
        <Stat
          icon={<ShieldCheck size={18} />}
          label="Wallets"
          value={npr(stats.walletLiabilityNpr)}
          detail="Player balance"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card">
          <h2 className="font-display text-xl">Review Queue</h2>
          <div className="mt-4 space-y-3">
            {queue.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 hover:border-neon-cyan"
              >
                <span>{item.label}</span>
                <span
                  className={
                    item.value > 0 ? "text-neon-orange" : "text-neon-green"
                  }
                >
                  {item.value}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <h2 className="font-display text-xl">Recent Payments</h2>
          {stats.recentPayments.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">No payments yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th>User</th>
                  <th>Tournament</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2">
                      {p.user.profile?.ign ?? p.user.email}
                    </td>
                    <td>{p.tournament?.title ?? "-"}</td>
                    <td>{npr(p.amountNpr)}</td>
                    <td
                      className={
                        p.status === "APPROVED"
                          ? "text-neon-green"
                          : p.status === "REJECTED"
                            ? "text-red-400"
                            : "text-neon-orange"
                      }
                    >
                      {p.status}
                    </td>
                    <td>{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="font-display text-xl">Newest Players</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-white/60">
            <tr>
              <th>Email</th>
              <th>IGN</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2">{u.email}</td>
                <td>{u.profile?.ign ?? "-"}</td>
                <td>{u.role}</td>
                <td>{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, detail, accent }: any) {
  return (
    <div className={`card ${accent ? "shadow-neon" : ""}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-neon-cyan">
        {icon}
      </div>
      <p className="label">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{detail}</p>
    </div>
  );
}
