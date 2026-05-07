"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { profileSchema } from "@fireslot/shared";
import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";
import { PageHeader } from "@/components/ui";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    freeFireUid: "",
    ign: "",
    level: 1,
    region: "",
    headshotRate: 0,
    isEmulator: false,
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile)
      setForm({
        freeFireUid: user.profile.freeFireUid,
        ign: user.profile.ign,
        level: user.profile.level,
        region: user.profile.region ?? "",
        headshotRate: user.profile.headshotRate ?? 0,
        isEmulator: user.profile.isEmulator ?? false,
      });
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({
      freeFireUid: form.freeFireUid,
      ign: form.ign,
      level: Number(form.level),
      region: form.region || undefined,
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    try {
      await api("/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...parsed.data,
          headshotRate: Number(form.headshotRate) || null,
          isEmulator: !!form.isEmulator,
        }),
      });
      await refresh();
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  if (!user)
    return (
      <div className="mx-auto max-w-md">
        <GoogleAuthPanel title="Sign in to edit your profile" />
      </div>
    );

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Player identity"
        title="Player Profile"
        description="Keep your Free Fire UID, IGN, level, and region accurate for tournament verification."
      />
      <form onSubmit={submit} className="card mt-4 space-y-3">
        <div>
          <label className="label">Free Fire UID</label>
          <input
            className="input"
            value={form.freeFireUid}
            onChange={(e) => setForm({ ...form, freeFireUid: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">In-Game Name</label>
          <input
            className="input"
            value={form.ign}
            onChange={(e) => setForm({ ...form, ign: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Level</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input"
              value={form.level}
              onChange={(e) =>
                setForm({ ...form, level: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Region</label>
            <input
              className="input"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">BR Headshot Rate %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="input"
              value={form.headshotRate}
              onChange={(e) =>
                setForm({ ...form, headshotRate: Number(e.target.value) })
              }
            />
            <p className="mt-1 text-[10px] text-white/40">
              From your Free Fire career stats. Tournaments with a headshot rate
              limit will check this value.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label">Emulator / PC Player</span>
            <span className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
              <input
                type="checkbox"
                checked={form.isEmulator}
                onChange={(e) =>
                  setForm({ ...form, isEmulator: e.target.checked })
                }
              />
              <span className="text-xs text-white/70">
                I play on emulator / PC
              </span>
            </span>
          </label>
        </div>
        <button className="btn-primary w-full">Save</button>
        {msg && <p className="text-sm text-white/70">{msg}</p>}
      </form>
    </div>
  );
}
