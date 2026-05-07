"use client";
import { useEffect, useState } from "react";
import { api, FILE_BASE } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminPayments() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("PENDING");

  async function load() {
    setItems(await api(`/payments?status=${filter}`));
  }
  useEffect(() => {
    load().catch(() => {});
  }, [filter]);

  async function approve(id: string) {
    await api(`/payments/${id}/approve`, { method: "POST" });
    load();
  }
  async function reject(id: string) {
    const note = prompt("Reject reason?") ?? undefined;
    await api(`/payments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin queue"
        title="Payment Verification"
        description="Approve verified proofs to unlock room details and confirm player slots."
        action={
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => (
          <div key={p.id} className="card">
            <div className="flex justify-between">
              <div>
                <p className="label">
                  {p.tournament?.title ?? "Wallet deposit"}
                </p>
                <p className="font-semibold">
                  {p.user.profile?.ign ?? p.user.email}
                </p>
                <p className="text-sm text-white/60">{fmtDate(p.createdAt)}</p>
              </div>
              <p className="text-neon font-bold">{npr(p.amountNpr)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span>
                Method: {p.method} {p.reference && `· Ref: ${p.reference}`}
              </span>
              <StatusBadge status={p.status} />
            </div>
            {p.proofUrl && (
              <a
                href={`${FILE_BASE}${p.proofUrl}`}
                target="_blank"
                rel="noreferrer"
                className="block mt-2"
              >
                <img
                  src={`${FILE_BASE}${p.proofUrl}`}
                  alt="proof"
                  className="rounded-md max-h-48 border border-border"
                />
              </a>
            )}
            {p.status === "PENDING" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => approve(p.id)} className="btn-primary">
                  Approve
                </button>
                <button onClick={() => reject(p.id)} className="btn-outline">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <EmptyState title="No payments in this queue" />}
      </div>
    </div>
  );
}
