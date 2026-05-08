"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ButtonLoading, CardSkeleton } from "@/components/ui";

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  type: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  category: string;
  label: string;
  updatedAt: string;
}

export default function ConfigPage() {
  const [groups, setGroups] = useState<Record<string, ConfigItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<Record<string, ConfigItem[]>>("/admin/config");
      setGroups(data);
      const d: Record<string, string> = {};
      Object.values(data).flat().forEach((c) => (d[c.key] = c.value));
      setDrafts(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function save(key: string) {
    setSavingKey(key);
    setMsg(null);
    try {
      await api(`/admin/config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value: drafts[key] }),
      });
      setMsg(`Saved ${key}`);
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">System Config</h1>
        {msg && <span className="text-xs text-white/70">{msg}</span>}
      </div>

      {loading ? (
        <>
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </>
      ) : Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="card">
          <h2 className="font-display text-lg text-neon-cyan">{cat}</h2>
          <div className="mt-3 divide-y divide-border">
            {items.map((c) => (
              <div key={c.key} className="grid grid-cols-1 md:grid-cols-[200px_1fr_120px] gap-3 py-3 items-center">
                <div>
                  <div className="text-sm text-white">{c.label}</div>
                  <div className="text-[10px] text-white/40 font-mono">{c.key}</div>
                </div>
                <div>{renderInput(c, drafts[c.key], (v) => setDrafts((d) => ({ ...d, [c.key]: v })))}</div>
                <button
                  className="btn-primary"
                  disabled={savingKey === c.key || drafts[c.key] === c.value}
                  onClick={() => save(c.key)}
                >
                  <ButtonLoading loading={savingKey === c.key} loadingText="Saving...">
                    Save
                  </ButtonLoading>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderInput(c: ConfigItem, value: string, onChange: (v: string) => void) {
  if (c.type === "BOOLEAN") {
    return (
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (c.type === "NUMBER") {
    return (
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (c.type === "JSON") {
    return (
      <textarea
        className="input font-mono text-xs"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />;
}
