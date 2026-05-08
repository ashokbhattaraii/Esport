"use client";
import { useEffect, useState } from "react";
import { api, FILE_BASE } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { ButtonLoading, CardGridSkeleton, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminPayments() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      setItems(await api(`/payments?status=${filter}`));
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => {
    load().catch(() => {});
  }, [filter]);

  async function approve(id: string) {
    setActingKey(`${id}:approve`);
    try {
      await api(`/payments/${id}/approve`, { method: "POST" });
      await load(false);
    } finally {
      setActingKey(null);
    }
  }
  async function reject(id: string) {
    const note = prompt("Reject reason?") ?? undefined;
    setActingKey(`${id}:reject`);
    try {
      await api(`/payments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      await load(false);
    } finally {
      setActingKey(null);
    }
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
      {loading ? (
        <CardGridSkeleton count={4} />
      ) : (
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
                <button
                  onClick={() => approve(p.id)}
                  className="btn-primary"
                  disabled={actingKey?.startsWith(`${p.id}:`)}
                >
                  <ButtonLoading loading={actingKey === `${p.id}:approve`} loadingText="Approving...">
                    Approve
                  </ButtonLoading>
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="btn-outline"
                  disabled={actingKey?.startsWith(`${p.id}:`)}
                >
                  <ButtonLoading loading={actingKey === `${p.id}:reject`} loadingText="Rejecting...">
                    Reject
                  </ButtonLoading>
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <EmptyState title="No payments in this queue" />}
      </div>
      )}
    </div>
  );
}
