"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ButtonLoading, EmptyState, PageHeader, StatusBadge, TableLoading } from "@/components/ui";
import { npr } from "@/lib/utils";
import { UserAccessModal } from "@/components/admin/UserAccessModal";
import { Search, Shield, Sliders } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: "PLAYER" | "ADMIN";
  roleId: string | null;
  roleRef?: { id: string; name: string; isSystem: boolean } | null;
  isBanned: boolean;
  profile?: { ign?: string; freeFireUid?: string } | null;
  wallet?: { balanceNpr?: number } | null;
  _count?: { permissionOverrides: number };
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "border-neon-orange/50 bg-neon-orange/15 text-neon-orange",
  ADMIN: "border-neon/40 bg-neon/15 text-neon",
  MODERATOR: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  FINANCE: "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
  SUPPORT: "border-purple-400/40 bg-purple-400/10 text-purple-300",
  PLAYER: "border-border bg-surface text-white/60",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banningId, setBanningId] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      setUsers(await api("/admin/users"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function ban(id: string, banned: boolean) {
    setBanningId(id);
    try {
      await api(`/admin/users/${id}/${banned ? "unban" : "ban"}`, { method: "POST" });
      await load(false);
    } finally {
      setBanningId(null);
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && (u.roleRef?.name ?? "") !== roleFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        u.email.toLowerCase().includes(s) ||
        (u.name ?? "").toLowerCase().includes(s) ||
        (u.profile?.ign ?? "").toLowerCase().includes(s) ||
        (u.profile?.freeFireUid ?? "").toLowerCase().includes(s)
      );
    });
  }, [users, q, roleFilter]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { ALL: users.length, OVERRIDE: 0, BANNED: 0 };
    users.forEach((u) => {
      const k = u.roleRef?.name ?? "PLAYER";
      acc[k] = (acc[k] ?? 0) + 1;
      if ((u._count?.permissionOverrides ?? 0) > 0) acc.OVERRIDE += 1;
      if (u.isBanned) acc.BANNED += 1;
    });
    return acc;
  }, [users]);

  const roleOptions = Array.from(new Set(users.map((u) => u.roleRef?.name).filter(Boolean))) as string[];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Users & Access"
        description="Assign roles, fine-tune individual permissions, and manage account access."
      />

      <div className="card mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="input pl-8"
              placeholder="Search by email, name, IGN, or FF UID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input w-44" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Pill label={`Total: ${counts.ALL ?? 0}`} />
          <Pill label={`With Overrides: ${counts.OVERRIDE ?? 0}`} tone="neon-orange" />
          <Pill label={`Banned: ${counts.BANNED ?? 0}`} tone="red" />
          {Object.keys(ROLE_COLORS).map((name) =>
            counts[name] ? <Pill key={name} label={`${name}: ${counts[name]}`} cls={ROLE_COLORS[name]} /> : null,
          )}
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <TableLoading columns={6} rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No users match your filter" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>IGN / FF UID</th>
                <th>Role</th>
                <th>Wallet</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const roleName = u.roleRef?.name ?? "—";
                const overrides = u._count?.permissionOverrides ?? 0;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {u.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-border" />
                        )}
                        <div>
                          <div className="text-white">{u.name ?? u.email}</div>
                          <div className="text-[10px] text-white/40">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-white/80">{u.profile?.ign ?? "—"}</div>
                      <div className="text-[10px] text-white/40 font-mono">{u.profile?.freeFireUid ?? "—"}</div>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                            ROLE_COLORS[roleName] ?? ROLE_COLORS.PLAYER
                          }`}
                        >
                          <Shield size={10} /> {roleName}
                        </span>
                        {overrides > 0 && (
                          <span className="inline-flex items-center gap-1 rounded border border-neon-orange/50 bg-neon-orange/15 px-2 py-0.5 text-[10px] font-semibold text-neon-orange">
                            <Sliders size={10} /> OVERRIDE ×{overrides}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{npr(u.wallet?.balanceNpr ?? 0)}</td>
                    <td>
                      <StatusBadge status={u.isBanned ? "BANNED" : "ACTIVE"} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => setEditing(u.id)} className="btn-outline text-xs">
                          Manage Access
                        </button>
                        {roleName !== "SUPER_ADMIN" && (
                          <button
                            onClick={() => ban(u.id, u.isBanned)}
                            className="btn-outline text-xs"
                            disabled={banningId === u.id}
                          >
                            <ButtonLoading loading={banningId === u.id} loadingText="Saving...">
                              {u.isBanned ? "Unban" : "Ban"}
                            </ButtonLoading>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <UserAccessModal userId={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}

function Pill({ label, tone, cls }: { label: string; tone?: string; cls?: string }) {
  const base =
    cls ??
    (tone === "red"
      ? "border-red-500/40 bg-red-500/10 text-red-400"
      : tone === "neon-orange"
        ? "border-neon-orange/40 bg-neon-orange/10 text-neon-orange"
        : "border-border bg-surface text-white/70");
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${base}`}>
      {label}
    </span>
  );
}
