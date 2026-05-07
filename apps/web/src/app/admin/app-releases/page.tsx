"use client";
import { useEffect, useState } from "react";
import { api, FILE_BASE } from "@/lib/api";
import { Upload, CheckCircle2, Smartphone } from "lucide-react";

interface AppRelease {
  id: string;
  version: string;
  releaseNotes: string | null;
  filename: string;
  downloadCount: number;
  isLatest: boolean;
  createdAt: string;
}

export default function AdminAppReleases() {
  const [items, setItems] = useState<AppRelease[]>([]);
  const [version, setVersion] = useState("1.0.0");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setItems(await api<AppRelease[]>("/admin/app-releases"));
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setMsg("Pick an APK first");
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("apk", file);
      fd.append("version", version);
      fd.append("releaseNotes", notes);
      fd.append("isLatest", "true");
      await api("/admin/app-releases", { method: "POST", body: fd });
      setMsg("Released ✓");
      setFile(null);
      setNotes("");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function setLatest(id: string, isLatest: boolean) {
    await api(`/admin/app-releases/${id}/latest`, {
      method: "PUT",
      body: JSON.stringify({ isLatest }),
    });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Admin</p>
        <h1 className="font-display text-2xl flex items-center gap-2">
          <Smartphone /> App Releases
        </h1>
      </div>

      <form onSubmit={upload} className="card space-y-3">
        <h2 className="font-display text-lg">Upload New APK</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Version</label>
            <input className="input" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" required />
          </div>
          <div>
            <label className="label">APK File</label>
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Release Notes</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's new?" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={uploading} type="submit">
            <Upload size={14} /> {uploading ? "Uploading…" : "Upload & Mark Latest"}
          </button>
          {msg && <span className="text-xs text-white/70">{msg}</span>}
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Notes</th>
              <th>File</th>
              <th>Downloads</th>
              <th>Created</th>
              <th>Latest</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">{r.version}</td>
                <td className="max-w-xs truncate">{r.releaseNotes ?? "—"}</td>
                <td className="font-mono text-xs">
                  <a className="text-neon-cyan hover:underline" href={`${FILE_BASE}/downloads/${r.filename}`} download>
                    {r.filename}
                  </a>
                </td>
                <td>{r.downloadCount}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  {r.isLatest ? (
                    <span className="inline-flex items-center gap-1 rounded border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[10px] text-neon-green">
                      <CheckCircle2 size={10} /> Latest
                    </span>
                  ) : (
                    <button onClick={() => setLatest(r.id, true)} className="btn-outline text-xs">
                      Mark latest
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-white/40 py-6">No releases yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
