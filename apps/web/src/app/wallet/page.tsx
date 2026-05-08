"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { withdrawalSchema } from "@fireslot/shared";
import { ButtonLoading, EmptyState, LoadingState, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";

export default function WalletPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [data, setData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [form, setForm] = useState({
    amountNpr: 100,
    method: "esewa" as const,
    account: "",
  });
  const [deposit, setDeposit] = useState({
    amountNpr: 100,
    method: "esewa",
    reference: "",
  });
  const [proof, setProof] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [depositing, setDepositing] = useState(false);

  async function load() {
    setDataLoading(true);
    try {
      const [walletData, paymentRows] = await Promise.all([
        api("/wallet"),
        api("/payments/me"),
      ]);
      setData(walletData);
      setPayments(paymentRows);
    } finally {
      setDataLoading(false);
    }
  }
  useEffect(() => {
    setTab(
      new URLSearchParams(window.location.search).get("tab") === "withdraw"
        ? "withdraw"
        : "deposit",
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    load().catch(() => {});
  }, [user]);

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    const parsed = withdrawalSchema.safeParse({
      ...form,
      amountNpr: Number(form.amountNpr),
    });
    if (!parsed.success) {
      setMsg(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setWithdrawing(true);
    try {
      await api("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setMsg("Withdrawal request submitted.");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setWithdrawing(false);
    }
  }

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!proof) {
      setMsg("Upload payment proof screenshot.");
      return;
    }
    setDepositing(true);
    const fd = new FormData();
    fd.append("amountNpr", String(deposit.amountNpr));
    fd.append("method", deposit.method);
    fd.append("reference", deposit.reference);
    fd.append("proof", proof);
    try {
      await api("/payments/deposit", { method: "POST", body: fd });
      setMsg("Deposit submitted. Admin approval will update your balance.");
      setProof(null);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setDepositing(false);
    }
  }

  if (loading) return <LoadingState label="Loading wallet..." />;
  if (!user) {
    return (
      <div className="pt-6">
        <GoogleAuthPanel title="Sign in to use your wallet" />
      </div>
    );
  }
  if (!data || dataLoading) return <LoadingState label="Loading wallet..." />;

  return (
    <div>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card/90 p-5">
          <p className="label">Available Balance</p>
          <p className="mt-2 font-display text-4xl text-white">
            {npr(data.wallet.balanceNpr)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setTab("deposit")}
              className={tab === "deposit" ? "btn-primary" : "btn-outline"}
            >
              Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={tab === "withdraw" ? "btn-primary" : "btn-outline"}
            >
              Withdraw
            </button>
          </div>
        </div>

        {tab === "deposit" ? (
          <form onSubmit={submitDeposit} className="card space-y-3">
            <h3 className="font-display text-lg">Deposit Balance</h3>
            <div className="card">
              <p className="label">Payment targets</p>
              <p className="mt-1 text-sm text-white/70">
                Pay with eSewa, Khalti, or bank, then upload screenshot proof.
              </p>
            </div>
            <div>
              <label className="label">Amount (NPR)</label>
              <input
                type="number"
                min={50}
                className="input"
                value={deposit.amountNpr}
                onChange={(e) =>
                  setDeposit({ ...deposit, amountNpr: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={deposit.method}
                onChange={(e) =>
                  setDeposit({ ...deposit, method: e.target.value })
                }
              >
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="label">Reference / Tx ID</label>
              <input
                className="input"
                value={deposit.reference}
                onChange={(e) =>
                  setDeposit({ ...deposit, reference: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Payment Proof</label>
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={depositing}>
              <ButtonLoading loading={depositing} loadingText="Submitting deposit...">
                Submit Deposit
              </ButtonLoading>
            </button>
          </form>
        ) : (
          <form onSubmit={withdraw} className="card space-y-3">
            <h3 className="font-display text-lg">Request Withdrawal</h3>
            <div>
              <label className="label">Amount (NPR)</label>
              <input
                type="number"
                min={100}
                className="input"
                value={form.amountNpr}
                onChange={(e) =>
                  setForm({ ...form, amountNpr: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) =>
                  setForm({ ...form, method: e.target.value as any })
                }
              >
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="label">Account Number / ID</label>
              <input
                className="input"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={withdrawing}>
              <ButtonLoading loading={withdrawing} loadingText="Submitting request...">
                Submit Request
              </ButtonLoading>
            </button>
          </form>
        )}

        {msg && (
          <p className="rounded-lg border border-border bg-surface p-3 text-sm text-white/70">
            {msg}
          </p>
        )}

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display text-lg mb-3">
              Deposit & Payment History
            </h3>
            {payments.length === 0 ? (
              <EmptyState title="No payments yet" />
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 8).map((p: any) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-surface/70 p-3 text-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <span>{p.tournament?.title ?? "Wallet deposit"}</span>
                      <span>{npr(p.amountNpr)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-white/50">
                      <span>{fmtDate(p.createdAt)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-display text-lg mb-3">Recent Transactions</h3>
            {data.wallet.transactions.length === 0 ? (
              <EmptyState title="No transactions yet" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.wallet.transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.createdAt)}</td>
                      <td>
                        <StatusBadge status={t.type} />
                      </td>
                      <td>{t.reason}</td>
                      <td>{npr(t.amountNpr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card">
            <h3 className="font-display text-lg mb-3">Withdrawal Requests</h3>
            {data.withdrawals.length === 0 ? (
              <EmptyState title="No withdrawal requests" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.withdrawals.map((w: any) => (
                    <tr key={w.id}>
                      <td>{fmtDate(w.createdAt)}</td>
                      <td>{w.method}</td>
                      <td>{npr(w.amountNpr)}</td>
                      <td>
                        <StatusBadge status={w.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
