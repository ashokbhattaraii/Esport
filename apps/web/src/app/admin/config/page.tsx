"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ButtonLoading } from "@/components/ui";
import { Save, Upload } from "lucide-react";

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
}

const LABELS: Record<string, { label: string; description: string; type: "text" | "url" | "textarea" | "image" }> = {
  deposit_qr_url: { label: "Payment QR Code URL", description: "Direct image URL of the QR code shown on deposit page", type: "image" },
  deposit_account_id: { label: "Payment Account Number", description: "eSewa/Khalti number or bank account shown to users", type: "text" },
  deposit_account_name: { label: "Payment Account Name", description: "Name shown next to the payment account", type: "text" },
  deposit_instructions: { label: "Deposit Instructions", description: "Guidance text shown to users when making a deposit", type: "textarea" },
};

export default function ConfigPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<ConfigItem[]>("/admin/app-config");
      setItems(data);
      const d: Record<string, string> = {};
      data.forEach((c) => (d[c.key] = c.value));
      setDrafts(d);
    } finally { setLoading(false); }
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);

  async function save(key: string) {
    setSavingKey(key);
    setMsg(null);
    try {
      await api(`/admin/app-config/${key}`, { method: "PUT", body: JSON.stringify({ value: drafts[key] }) });
      setMsg(`Saved "${LABELS[key]?.label ?? key}" successfully`);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSavingKey(null); }
  }

  const paymentConfigs = items.filter(i => i.key.startsWith("deposit_"));
  const otherConfigs = items.filter(i => !i.key.startsWith("deposit_"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--fs-text-1)" }}>System Configuration</h1>
        {msg && <span style={{ fontSize: 12, color: "var(--fs-green)", maxWidth: 200, textAlign: "right" }}>{msg}</span>}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="fs-skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : (
        <>
          {/* Payment Settings Section */}
          <div style={{ background: "var(--fs-surface-1)", borderRadius: 14, border: "0.5px solid var(--fs-border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--fs-border)", background: "var(--fs-surface-2)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--fs-text-1)" }}>Payment & Deposit Settings</p>
              <p style={{ fontSize: 11, color: "var(--fs-text-3)", marginTop: 2 }}>Configure QR code, account details, and instructions shown on the deposit page</p>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {paymentConfigs.map(c => {
                const meta = LABELS[c.key] ?? { label: c.key, description: "", type: "text" };
                const changed = drafts[c.key] !== c.value;
                return (
                  <div key={c.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fs-text-1)" }}>{meta.label}</p>
                        <p style={{ fontSize: 11, color: "var(--fs-text-3)" }}>{meta.description}</p>
                      </div>
                      {changed && (
                        <button
                          onClick={() => save(c.key)}
                          disabled={savingKey === c.key}
                          className="fs-btn fs-btn-primary fs-btn-sm"
                          style={{ flexShrink: 0 }}
                        >
                          <ButtonLoading loading={savingKey === c.key} loadingText="...">
                            <Save size={12} /> Save
                          </ButtonLoading>
                        </button>
                      )}
                    </div>
                    {meta.type === "image" ? (
                      <div>
                        <input
                          className="fs-input"
                          placeholder="https://example.com/qr-code.png"
                          value={drafts[c.key] ?? ""}
                          onChange={(e) => setDrafts(d => ({ ...d, [c.key]: e.target.value }))}
                        />
                        {drafts[c.key] && (
                          <div style={{ marginTop: 10, padding: 12, background: "#fff", borderRadius: 8, display: "inline-block" }}>
                            <img src={drafts[c.key]} alt="QR Preview" style={{ width: 120, height: 120, objectFit: "contain" }} />
                          </div>
                        )}
                      </div>
                    ) : meta.type === "textarea" ? (
                      <textarea
                        className="fs-input"
                        style={{ height: 80, paddingTop: 12, resize: "vertical" }}
                        value={drafts[c.key] ?? ""}
                        onChange={(e) => setDrafts(d => ({ ...d, [c.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="fs-input"
                        value={drafts[c.key] ?? ""}
                        onChange={(e) => setDrafts(d => ({ ...d, [c.key]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other Settings */}
          {otherConfigs.length > 0 && (
            <div style={{ background: "var(--fs-surface-1)", borderRadius: 14, border: "0.5px solid var(--fs-border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--fs-border)", background: "var(--fs-surface-2)" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--fs-text-1)" }}>Other Settings</p>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                {otherConfigs.map(c => {
                  const changed = drafts[c.key] !== c.value;
                  return (
                    <div key={c.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fs-text-1)", fontFamily: "monospace" }}>{c.key}</p>
                        {changed && (
                          <button onClick={() => save(c.key)} disabled={savingKey === c.key} className="fs-btn fs-btn-primary fs-btn-sm" style={{ flexShrink: 0 }}>
                            <ButtonLoading loading={savingKey === c.key} loadingText="..."><Save size={12} /> Save</ButtonLoading>
                          </button>
                        )}
                      </div>
                      <input
                        className="fs-input"
                        value={drafts[c.key] ?? ""}
                        onChange={(e) => setDrafts(d => ({ ...d, [c.key]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
