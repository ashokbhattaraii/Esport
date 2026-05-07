"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Permission { id?: string; resource: string; action: string }
interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  permissionCount: number;
  userCount: number;
}

const RESOURCES = ["tournaments", "payments", "users", "withdrawals", "results", "config", "*"];
const ACTIONS = ["read", "write", "approve", "delete", "ban", "*"];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [newRoleName, setNewRoleName] = useState("");

  async function load() {
    setRoles(await api<Role[]>("/admin/roles"));
  }
  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);

  function startEdit(r: Role) {
    setEditing(r.id);
    setEditPerms(r.permissions.map(({ resource, action }) => ({ resource, action })));
  }
  function togglePerm(resource: string, action: string) {
    const has = editPerms.some((p) => p.resource === resource && p.action === action);
    setEditPerms(has
      ? editPerms.filter((p) => !(p.resource === resource && p.action === action))
      : [...editPerms, { resource, action }]
    );
  }
  async function savePerms(id: string) {
    try {
      await api(`/admin/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: editPerms }),
      });
      setEditing(null);
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function createRole() {
    if (!newRoleName.trim()) return;
    try {
      await api("/admin/roles", { method: "POST", body: JSON.stringify({ name: newRoleName, permissions: [] }) });
      setNewRoleName("");
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function deleteRole(id: string) {
    if (!confirm("Delete role?")) return;
    try {
      await api(`/admin/roles/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Roles & Permissions</h1>
        {msg && <span className="text-xs text-white/70">{msg}</span>}
      </div>

      <div className="card flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">New Role Name</label>
          <input className="input" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={createRole}>Create</button>
      </div>

      {roles.map((r) => (
        <div key={r.id} className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-white">
                {r.name}
                {r.isSystem && <span className="ml-2 text-xs text-neon-cyan">SYSTEM</span>}
              </h2>
              <div className="text-xs text-white/50">{r.permissionCount} permissions • {r.userCount} users</div>
            </div>
            <div className="flex gap-2">
              {editing === r.id ? (
                <>
                  <button className="btn-primary" onClick={() => savePerms(r.id)}>Save</button>
                  <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                </>
              ) : (
                <button className="btn-outline" onClick={() => startEdit(r)}>Edit Permissions</button>
              )}
              {!r.isSystem && <button className="btn-outline text-red-400" onClick={() => deleteRole(r.id)}>Delete</button>}
            </div>
          </div>

          {editing === r.id ? (
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="text-white/50">
                  <th className="text-left p-1">resource \\ action</th>
                  {ACTIONS.map((a) => <th key={a} className="p-1">{a}</th>)}
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map((res) => (
                  <tr key={res} className="border-t border-border">
                    <td className="p-1 text-white/80 font-mono">{res}</td>
                    {ACTIONS.map((a) => {
                      const has = editPerms.some((p) => p.resource === res && p.action === a);
                      return (
                        <td key={a} className="p-1 text-center">
                          <input type="checkbox" checked={has} onChange={() => togglePerm(res, a)} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1">
              {r.permissions.length === 0 && <span className="text-xs text-white/40">No permissions</span>}
              {r.permissions.map((p, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-surface text-neon-cyan font-mono">
                  {p.resource}:{p.action}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
