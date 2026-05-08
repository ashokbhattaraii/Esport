"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  GameModeLabels,
  GameModes,
  challengeCreateSchema,
} from "@fireslot/shared";
import { ButtonLoading, PageHeader } from "@/components/ui";

export default function NewChallenge() {
  const r = useRouter();
  const [form, setForm] = useState({
    title: "",
    mode: "BR_SQUAD" as any,
    entryFeeNpr: 50,
    prizeAmountNpr: 100,
    maxPlayers: 8,
    opponentType: "PUBLIC" as const,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = challengeCreateSchema.safeParse({
      ...form,
      entryFeeNpr: Number(form.entryFeeNpr),
      prizeAmountNpr: Number(form.prizeAmountNpr),
      maxPlayers: Number(form.maxPlayers),
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setSubmitting(true);
    try {
      await api("/challenges", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      r.push("/challenges");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Custom room"
        title="Create Challenge"
        description="Set the match mode, stake, prize, and player count for a public or private challenge."
      />
      <form onSubmit={submit} className="card mt-4 space-y-3">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Mode</label>
          <select
            className="input"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            {GameModes.map((m) => (
              <option key={m} value={m}>
                {GameModeLabels[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Entry NPR</label>
            <input
              type="number"
              min={20}
              max={50}
              step={5}
              className="input"
              value={form.entryFeeNpr}
              onChange={(e) =>
                setForm({ ...form, entryFeeNpr: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Prize NPR</label>
            <input
              type="number"
              step={5}
              className="input"
              value={form.prizeAmountNpr}
              onChange={(e) =>
                setForm({ ...form, prizeAmountNpr: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Max Players</label>
            <input
              type="number"
              min={2}
              className="input"
              value={form.maxPlayers}
              onChange={(e) =>
                setForm({ ...form, maxPlayers: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <label className="label">Opponent</label>
          <select
            className="input"
            value={form.opponentType}
            onChange={(e) =>
              setForm({ ...form, opponentType: e.target.value as any })
            }
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={submitting}>
          <ButtonLoading loading={submitting} loadingText="Creating...">
            Create
          </ButtonLoading>
        </button>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
      </form>
    </div>
  );
}
