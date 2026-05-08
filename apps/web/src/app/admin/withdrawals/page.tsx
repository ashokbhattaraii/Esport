"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { ButtonLoading, EmptyState, PageHeader, StatusBadge, TableLoading } from "@/components/ui";

export default function AdminWithdrawals() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      setItems(await api(`/wallet/withdrawals?status=${filter}`));
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => {
    load().catch(() => {});
  }, [filter]);

  async function review(id: string, status: string) {
    const note =
      status !== "APPROVED" ? (prompt("Note?") ?? undefined) : undefined;
    setActingKey(`${id}:${status}`);
    try {
      await api(`/wallet/withdrawals/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, note }),
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
        title="Withdrawal Requests"
        description="Approve, reject, and mark player payout requests as paid."
        action={
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
      />
      <div className="table-wrap">
        {loading ? (
          <TableLoading columns={7} rows={6} />
        ) : items.length === 0 ? (
          <EmptyState title="No withdrawals in this queue" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Method</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>{fmtDate(w.createdAt)}</td>
                  <td>{w.user.profile?.ign ?? w.user.email}</td>
                  <td>{w.method}</td>
                  <td>{w.account}</td>
                  <td>{npr(w.amountNpr)}</td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="space-x-1">
                    {w.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => review(w.id, "APPROVED")}
                          className="btn-outline text-xs"
                          disabled={actingKey?.startsWith(`${w.id}:`)}
                        >
                          <ButtonLoading loading={actingKey === `${w.id}:APPROVED`} loadingText="Approving...">
                            Approve
                          </ButtonLoading>
                        </button>
                        <button
                          onClick={() => review(w.id, "REJECTED")}
                          className="btn-outline text-xs"
                          disabled={actingKey?.startsWith(`${w.id}:`)}
                        >
                          <ButtonLoading loading={actingKey === `${w.id}:REJECTED`} loadingText="Rejecting...">
                            Reject
                          </ButtonLoading>
                        </button>
                      </>
                    )}
                    {w.status === "APPROVED" && (
                      <button
                        onClick={() => review(w.id, "PAID")}
                        className="btn-primary text-xs"
                        disabled={actingKey?.startsWith(`${w.id}:`)}
                      >
                        <ButtonLoading loading={actingKey === `${w.id}:PAID`} loadingText="Saving...">
                          Mark Paid
                        </ButtonLoading>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
