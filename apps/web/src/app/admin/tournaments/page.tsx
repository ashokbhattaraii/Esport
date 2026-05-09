"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { GameModeLabels, GameModes } from "@fireslot/shared";
import { fmtDate, npr } from "@/lib/utils";
import { ButtonLoading, CardSkeleton, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const BANNED_GUNS = ["Double Vector", "M79", "Grenade Launcher", "Rocket Launcher"];

const initialForm = {
  title: "",
  description: "",
  mode: "BR_SOLO",
  map: "Bermuda",
  type: "SOLO_TOP3",
  entryFeeNpr: 15,
  prizePoolNpr: 0,
  maxSlots: 48,
  dateTime: "",
  rules: "",
  minLevel: 40,
  maxHeadshotRate: 70,
  allowEmulator: false,
  characterSkillOn: true,
  gunAttributesOn: false,
  bannedGuns: ["Double Vector", "M79"] as string[],
};

export default function AdminTournaments() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(initialForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      setItems(await api("/tournaments"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => { load().catch(() => {}); }, []);

  // Live pricing preview
  useEffect(() => {
    const fee = Number(form.entryFeeNpr);
    const slots = Number(form.maxSlots);
    if (!fee || !slots) return setPreview(null);
    const ctrl = new AbortController();
    api(`/tournaments/preview/pricing?entryFee=${fee}&maxPlayers=${slots}`)
      .then(setPreview)
      .catch(() => setPreview(null));
    return () => ctrl.abort();
  }, [form.entryFeeNpr, form.maxSlots]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCreating(true);
    try {
      await api("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          entryFeeNpr: Number(form.entryFeeNpr),
          prizePoolNpr: preview?.grossPool ?? 0,
          maxSlots: Number(form.maxSlots),
          minLevel: Number(form.minLevel),
          maxHeadshotRate: Number(form.maxHeadshotRate),
          dateTime: new Date(form.dateTime).toISOString(),
        }),
      });
      setForm(initialForm);
      setOpen(false);
      await load(false);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setActionKey(`${id}:status`);
    try {
      await api(`/tournaments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await load(false);
    } finally {
      setActionKey(null);
    }
  }

  async function publishRoom(id: string) {
    const roomId = prompt("Room ID?");
    if (!roomId) return;
    const roomPassword = prompt("Room password?");
    if (!roomPassword) return;
    setActionKey(`${id}:room`);
    try {
      await api(`/tournaments/${id}/room`, {
        method: "PUT",
        body: JSON.stringify({ roomId, roomPassword }),
      });
      await load(false);
    } finally {
      setActionKey(null);
    }
  }

  async function lockRoom(id: string) {
    if (!confirm("Lock room and finalize prizes? This sets actualPlayers and recomputes Per Kill / Booyah.")) return;
    setActionKey(`${id}:lock`);
    try {
      await api(`/tournaments/${id}/lock-room`, { method: "POST" });
      await load(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionKey(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Tournaments"
        description="Pool scales with actual players. Per Kill and Booyah are auto-computed at room lock."
        action={
          <button onClick={() => setOpen(!open)} className="btn-primary">
            {open ? "Close" : "New"}
          </button>
        }
      />

      {open && (
        <form onSubmit={create} className="card mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Map (Bermuda / Kalahari / Purgatory)"
              value={form.map}
              onChange={(e) => setForm({ ...form, map: e.target.value })}
            />
            <select
              className="input"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              {GameModes.map((m) => (
                <option key={m} value={m}>{GameModeLabels[m]}</option>
              ))}
            </select>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="SOLO_TOP3">Solo Top 3</option>
              <option value="SOLO_1ST">Solo Winner Takes All</option>
              <option value="SQUAD_TOP10">Squad Top 10</option>
              <option value="KILL_RACE">Kill Race</option>
              <option value="COMBO">Combo</option>
              <option value="FREE_DAILY">Free Daily</option>
            </select>
          </div>

          <textarea
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* Entry Fee — slider + live preview, same pattern as challenge create */}
          <div className="rounded-xl border border-white/10 bg-[#0f0628] p-3">
            <p className="mb-2 flex items-center gap-1 text-sm font-bold text-white">
              💰 Entry Fee
            </p>
            <input
              type="range"
              min={20}
              max={50}
              step={5}
              value={form.entryFeeNpr}
              onChange={(e) => setForm({ ...form, entryFeeNpr: Number(e.target.value) })}
              className="w-full accent-yellow-400"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-white/70">
              <span>Rs {form.entryFeeNpr}</span>
              {preview && (
                <span>
                  Per Kill <b className="text-yellow-300">Rs {preview.perKillReward}</b> · Booyah <b className="text-neon-cyan">Rs {preview.booyahPrize}</b>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Max Slots" value={form.maxSlots} onChange={(v) => setForm({ ...form, maxSlots: v })} min={2} step={1} />
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                required
              />
            </div>
          </div>

          {preview && (
            <div className="rounded-lg border border-neon/40 bg-neon/5 p-3 text-sm">
              <p className="label text-neon">If {preview.actualPlayers} players join</p>
              <p className="mt-1 text-white/80">
                Pool <b>{npr(preview.grossPool)}</b> →
                Platform <b>{npr(preview.platformCut)}</b> ({preview.systemFeePercent}%) →
                Net <b>{npr(preview.netPool)}</b>
              </p>
              <p className="mt-1 text-white/80">
                Per Kill: <b className="text-neon">{npr(preview.perKillReward)}</b> · Booyah: <b className="text-neon-cyan">{npr(preview.booyahPrize)}</b>
              </p>
              <p className="mt-1 text-xs text-white/50">{preview.exampleEarning} • {preview.scalingNote}</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface/50 p-3">
            <p className="label mb-2">Eligibility</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumberInput label="Min FF Level" value={form.minLevel} onChange={(v) => setForm({ ...form, minLevel: v })} min={1} step={1} />
              <NumberInput label="Max Headshot %" value={form.maxHeadshotRate} onChange={(v) => setForm({ ...form, maxHeadshotRate: v })} min={0} max={100} step={1} />
              <Toggle label="Allow Emulator" checked={form.allowEmulator} onChange={(v) => setForm({ ...form, allowEmulator: v })} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface/50 p-3">
            <p className="label mb-2">Room Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <Toggle label="Character Skill" checked={form.characterSkillOn} onChange={(v) => setForm({ ...form, characterSkillOn: v })} />
              <Toggle label="Gun Attributes" checked={form.gunAttributesOn} onChange={(v) => setForm({ ...form, gunAttributesOn: v })} />
            </div>
            <p className="label mt-3 mb-1">Banned Guns</p>
            <div className="flex flex-wrap gap-2">
              {BANNED_GUNS.map((g) => {
                const active = form.bannedGuns.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() =>
                      setForm({
                        ...form,
                        bannedGuns: active
                          ? form.bannedGuns.filter((x: string) => x !== g)
                          : [...form.bannedGuns, g],
                      })
                    }
                    className={`px-2 py-1 rounded text-xs ${active ? "bg-red-500/20 border border-red-500/50 text-red-300" : "bg-surface text-white/60 border border-border"}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            className="input"
            placeholder="Extra rules (optional)"
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
          />

          <button className="btn-primary w-full" disabled={creating}>
            <ButtonLoading loading={creating} loadingText="Creating tournament...">
              Create Tournament
            </ButtonLoading>
          </button>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No tournaments yet" />
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">{GameModeLabels[t.mode as keyof typeof GameModeLabels]}</p>
                  <h3 className="font-semibold text-white">{t.title}</h3>
                  <p className="mt-1 text-xs text-white/50">{fmtDate(t.dateTime)}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                <Mini label="Fee" value={npr(t.entryFeeNpr)} />
                <Mini label="Per Kill" value={npr(t.perKillReward ?? 0)} />
                <Mini label="Booyah" value={npr(t.booyahPrize ?? 0)} />
                <Mini label="Slots" value={`${t.filledSlots}/${t.maxSlots}`} />
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  className="btn-outline text-xs"
                  onClick={() => publishRoom(t.id)}
                  disabled={actionKey?.startsWith(`${t.id}:`)}
                >
                  <ButtonLoading loading={actionKey === `${t.id}:room`} loadingText="Saving room...">
                    Room
                  </ButtonLoading>
                </button>
                <button
                  className="btn-outline text-xs"
                  onClick={() => lockRoom(t.id)}
                  disabled={t.roomLocked || actionKey?.startsWith(`${t.id}:`)}
                >
                  <ButtonLoading loading={actionKey === `${t.id}:lock`} loadingText="Locking...">
                    {t.roomLocked ? `Locked (${t.actualPlayers})` : "Lock Room"}
                  </ButtonLoading>
                </button>
                <select
                  onChange={(e) => setStatus(t.id, e.target.value)}
                  className="input text-xs flex-1 min-w-[120px]"
                  defaultValue=""
                  disabled={actionKey?.startsWith(`${t.id}:`)}
                >
                  <option value="" disabled>Status</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberInput({
  label, value, onChange, min = 0, max, step = 5,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-2 py-2 text-xs">
      <span className="text-white/80">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-border rounded-full peer-checked:bg-neon transition" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white peer-checked:translate-x-4 transition" />
      </label>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <p className="label">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
