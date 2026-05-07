"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function AdminWithdrawals() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("PENDING");
  async function load() {
    setItems(await api(`/wallet/withdrawals?status=${filter}`));
  }
  useEffect(() => {
    load().catch(() => {});
  }, [filter]);

  async function review(id: string, status: string) {
    const note =
      status !== "APPROVED" ? (prompt("Note?") ?? undefined) : undefined;
    await api(`/wallet/withdrawals/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    });
    load();
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
        {items.length === 0 ? (
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
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => review(w.id, "REJECTED")}
                          className="btn-outline text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {w.status === "APPROVED" && (
                      <button
                        onClick={() => review(w.id, "PAID")}
                        className="btn-primary text-xs"
                      >
                        Mark Paid
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
