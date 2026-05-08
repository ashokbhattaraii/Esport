"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TableLoading } from "@/components/ui";

interface Log {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: any;
  newValue: any;
  ip: string | null;
  createdAt: string;
  admin: { email: string; name: string | null };
}

export default function LogsPage() {
  const [data, setData] = useState<{ items: Log[]; total: number } | null>(null);
  const [resource, setResource] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "50" });
      if (resource) q.set("resource", resource);
      const r = await api<{ items: Log[]; total: number }>(`/admin/logs?${q}`);
      setData(r);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [page, resource]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Audit Logs</h1>
        <select className="input w-40" value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }}>
          <option value="">All resources</option>
          <option value="config">config</option>
          <option value="role">role</option>
          <option value="user">user</option>
          <option value="free_daily_window">free_daily_window</option>
        </select>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {loading ? (
        <TableLoading columns={7} rows={8} />
      ) : (
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-white/50">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Admin</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Resource</th>
              <th className="text-left p-2">Resource ID</th>
              <th className="text-left p-2">Diff</th>
              <th className="text-left p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-2 text-white/70">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-2">{l.admin?.email}</td>
                <td className="p-2 text-neon-cyan font-mono">{l.action}</td>
                <td className="p-2">{l.resource}</td>
                <td className="p-2 font-mono text-white/60">{l.resourceId ?? "—"}</td>
                <td className="p-2">
                  {l.oldValue && <pre className="text-[10px] text-red-300">{JSON.stringify(l.oldValue)}</pre>}
                  {l.newValue && <pre className="text-[10px] text-neon-green">{JSON.stringify(l.newValue)}</pre>}
                </td>
                <td className="p-2 text-white/50">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <div className="flex items-center gap-3">
        <button disabled={loading || page <= 1} onClick={() => setPage(page - 1)} className="btn-outline">Prev</button>
        <span className="text-sm text-white/60">Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / 50))}</span>
        <button disabled={loading || (data?.items.length ?? 0) < 50} onClick={() => setPage(page + 1)} className="btn-outline">Next</button>
      </div>
    </div>
  );
}
