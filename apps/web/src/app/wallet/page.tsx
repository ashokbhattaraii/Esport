"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, npr } from "@/lib/utils";
import { withdrawalSchema } from "@fireslot/shared";
import { ButtonLoading, EmptyState, LoadingState, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";
import { ArrowUpRight, Plus } from "lucide-react";

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
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="fs-card overflow-hidden">
        <div style={{ height: '3px', background: 'var(--fs-red)' }} />
        <div className="p-5 text-center">
          <p className="fs-caption">YOUR BALANCE</p>
          <p className="mt-2 text-5xl font-bold" style={{ color: 'var(--fs-text-1)' }}>
            {npr(data.wallet.balanceNpr)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setTab("deposit")}
              className={`fs-btn fs-btn-full ${tab === "deposit" ? "fs-btn-primary" : "fs-btn-outline"}`}
            >
              <Plus size={16} /> Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`fs-btn fs-btn-full ${tab === "withdraw" ? "fs-btn-primary" : "fs-btn-outline"}`}
            >
              <ArrowUpRight size={16} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {tab === "deposit" ? (
        <form onSubmit={submitDeposit} className="fs-card fs-card-body space-y-4">
          <h3 className="fs-h3">Deposit Balance</h3>
          <div className="fs-card fs-card-body">
            <p className="fs-caption">Payment targets</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--fs-text-2)' }}>
              Pay with eSewa, Khalti, or bank, then upload screenshot proof.
            </p>
          </div>
          <div>
            <label className="fs-label">Amount (NPR)</label>
            <input
              type="number"
              min={50}
              className="fs-input"
              value={deposit.amountNpr}
              onChange={(e) =>
                setDeposit({ ...deposit, amountNpr: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="fs-label">Method</label>
            <select
              className="fs-input"
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
            <label className="fs-label">Reference / Tx ID</label>
            <input
              className="fs-input"
              value={deposit.reference}
              onChange={(e) =>
                setDeposit({ ...deposit, reference: e.target.value })
              }
            />
          </div>
          <div>
            <label className="fs-label">Payment Proof</label>
            <input
              type="file"
              accept="image/*"
              className="text-sm" style={{ color: 'var(--fs-text-2)' }}
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <button className="fs-btn fs-btn-primary fs-btn-full" disabled={depositing}>
            <ButtonLoading loading={depositing} loadingText="Submitting deposit...">
              Submit Deposit
            </ButtonLoading>
          </button>
        </form>
      ) : (
        <form onSubmit={withdraw} className="fs-card fs-card-body space-y-4">
          <h3 className="fs-h3">Request Withdrawal</h3>
          <div>
            <label className="fs-label">Amount (NPR)</label>
            <input
              type="number"
              min={100}
              className="fs-input"
              value={form.amountNpr}
              onChange={(e) =>
                setForm({ ...form, amountNpr: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="fs-label">Method</label>
            <select
              className="fs-input"
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
            <label className="fs-label">Account Number / ID</label>
            <input
              className="fs-input"
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
              required
            />
          </div>
          <button className="fs-btn fs-btn-primary fs-btn-full" disabled={withdrawing}>
            <ButtonLoading loading={withdrawing} loadingText="Submitting request...">
              Submit Request
            </ButtonLoading>
          </button>
        </form>
      )}

      {msg && (
        <p className="rounded-lg p-3 text-sm" style={{ background: 'var(--fs-surface-2)', border: '0.5px solid var(--fs-border)', color: 'var(--fs-text-2)' }}>
          {msg}
        </p>
      )}

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="fs-card fs-card-body">
          <h3 className="fs-h3 mb-3">Deposit & Payment History</h3>
          {payments.length === 0 ? (
            <EmptyState title="No payments yet" />
          ) : (
            <div className="space-y-0">
              {payments.slice(0, 8).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '0.5px solid var(--fs-border)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--fs-text-1)' }}>
                      {p.tournament?.title ?? "Wallet deposit"}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--fs-text-3)' }}>
                      {fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>
                      {npr(p.amountNpr)}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fs-card fs-card-body">
          <h3 className="fs-h3 mb-3">Recent Transactions</h3>
          {data.wallet.transactions.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <div className="space-y-0">
              {data.wallet.transactions.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '0.5px solid var(--fs-border)' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: t.type === 'CREDIT' ? 'var(--fs-green)' : 'var(--fs-red)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--fs-text-1)' }}>{t.reason}</span>
                    </div>
                    <p className="text-[11px] ml-4" style={{ color: 'var(--fs-text-3)' }}>{fmtDate(t.createdAt)}</p>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: t.type === 'CREDIT' ? 'var(--fs-green)' : 'var(--fs-red)' }}
                  >
                    {t.type === 'CREDIT' ? '+' : '-'}{npr(t.amountNpr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fs-card fs-card-body">
          <h3 className="fs-h3 mb-3">Withdrawal Requests</h3>
          {data.withdrawals.length === 0 ? (
            <EmptyState title="No withdrawal requests" />
          ) : (
            <div className="space-y-0">
              {data.withdrawals.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '0.5px solid var(--fs-border)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--fs-text-1)' }}>{w.method} • {npr(w.amountNpr)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--fs-text-3)' }}>{fmtDate(w.createdAt)}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
