"use client";
import { useEffect, useState } from "react";
import { api, FILE_BASE } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default function AdminResults() {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    setItems(await api("/results?verified=false"));
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);
  async function verify(id: string) {
    await api(`/results/${id}/verify`, { method: "POST" });
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin queue"
        title="Match Results"
        description="Review submitted screenshots, placements, and kills before marking results verified."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <div key={r.id} className="card">
            <p className="label">{r.tournament.title}</p>
            <p className="font-semibold">
              {r.submitter.profile?.ign ?? r.submitter.email}
            </p>
            <p className="text-sm">
              Placement: {r.placement ?? "—"} · Kills: {r.kills ?? "—"}
            </p>
            <p className="text-xs text-white/60">{fmtDate(r.createdAt)}</p>
            {r.screenshotUrl && (
              <img
                src={`${FILE_BASE}${r.screenshotUrl}`}
                alt="result"
                className="mt-2 rounded-md max-h-48 border border-border"
              />
            )}
            <button onClick={() => verify(r.id)} className="btn-primary mt-3">
              Verify
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <EmptyState
            title="No pending results"
            description="Unverified result submissions will appear here."
          />
        )}
      </div>
    </div>
  );
}
