"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Plus, MessageSquare, X, Send } from "lucide-react";
import { ButtonLoading, CardSkeleton, PageLoading } from "@/components/ui";

const CATEGORIES = [
  { v: "PAYMENT_ISSUE", label: "Payment Issue" },
  { v: "TOURNAMENT_ISSUE", label: "Tournament Issue" },
  { v: "WITHDRAWAL_ISSUE", label: "Withdrawal" },
  { v: "ACCOUNT_ISSUE", label: "Account" },
  { v: "RESULT_DISPUTE", label: "Result Dispute" },
  { v: "GENERAL", label: "General" },
];

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40",
  ASSIGNED: "bg-purple-400/20 text-purple-300 border-purple-400/40",
  IN_PROGRESS: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40",
  AWAITING_PLAYER: "bg-orange-400/20 text-orange-300 border-orange-400/40",
  RESOLVED: "bg-neon-green/20 text-neon-green border-neon-green/40",
  CLOSED: "bg-white/10 text-white/50 border-border",
};

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  updatedAt: string;
  createdAt: string;
}
interface TicketDetail extends Ticket {
  messages: { id: string; senderId: string; senderRole: string; message: string; createdAt: string; isInternal: boolean }[];
}

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState({ category: "GENERAL", subject: "", message: "" });

  async function load() {
    setTicketsLoading(true);
    try {
      const r = await api<{ items: Ticket[] }>("/support/tickets");
      setTickets(r.items);
    } finally {
      setTicketsLoading(false);
    }
  }
  useEffect(() => { if (user) load().catch(() => {}); }, [user]);

  async function loadDetail(id: string) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await api(`/support/tickets/${id}`));
    } finally {
      setDetailLoading(false);
    }
  }

  async function createTicket() {
    if (!draft.subject || !draft.message) return;
    setCreatingTicket(true);
    try {
      await api("/support/tickets", { method: "POST", body: JSON.stringify(draft) });
      setCreating(false);
      setDraft({ category: "GENERAL", subject: "", message: "" });
      await load();
    } finally {
      setCreatingTicket(false);
    }
  }

  async function sendReply() {
    if (!reply.trim() || !openId) return;
    setSendingReply(true);
    try {
      await api(`/support/tickets/${openId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: reply }),
      });
      setReply("");
      await loadDetail(openId);
    } finally {
      setSendingReply(false);
    }
  }

  if (authLoading) return <PageLoading label="Loading support..." />;
  if (!user) return <p className="text-white/60">Please sign in to view your tickets.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Support</p>
          <h1 className="font-display text-2xl text-white">My Tickets</h1>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {ticketsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="card text-center text-white/50">
          No tickets yet. Open one if you need help.
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => loadDetail(t.id)}
              className="card w-full text-left hover:border-neon-cyan/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-white/40">{t.ticketNumber}</div>
                  <div className="font-semibold text-white truncate">{t.subject}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-surface text-white/70">
                      {CATEGORIES.find((c) => c.v === t.category)?.label ?? t.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${STATUS_COLOR[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
                <MessageSquare size={16} className="text-white/40 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">New Ticket</h3>
              <button onClick={() => setCreating(false)}><X size={18} /></button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input" rows={4} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
              </div>
              <button
                className="btn-primary w-full"
                onClick={createTicket}
                disabled={creatingTicket}
              >
                <ButtonLoading loading={creatingTicket} loadingText="Submitting ticket...">
                  Submit Ticket
                </ButtonLoading>
              </button>
            </div>
          </div>
        </div>
      )}

      {openId && detailLoading && !detail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Opening Ticket</h3>
              <button onClick={() => { setOpenId(null); setDetail(null); }}><X size={18} /></button>
            </div>
            <div className="mt-4">
              <CardSkeleton lines={4} />
            </div>
          </div>
        </div>
      )}

      {openId && detail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono text-white/40">{detail.ticketNumber}</div>
                <h3 className="font-display text-lg">{detail.subject}</h3>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded border text-[10px] ${STATUS_COLOR[detail.status]}`}>
                  {detail.status}
                </span>
              </div>
              <button onClick={() => { setOpenId(null); setDetail(null); }}><X size={18} /></button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-2">
              {detail.messages.map((m) => {
                const mine = m.senderId === user.id;
                const bot = m.senderRole === "BOT";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      bot
                        ? "bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan"
                        : mine
                          ? "bg-neon/15 border border-neon/30 text-white"
                          : "bg-surface border border-border text-white/90"
                    }`}>
                      <div className="text-[10px] text-white/50 mb-1">
                        {bot ? "🤖 Auto-reply" : mine ? "You" : "Support"} · {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>
            {detail.status !== "CLOSED" && (
              <form
                onSubmit={(e) => { e.preventDefault(); sendReply(); }}
                className="mt-3 flex gap-2"
              >
                <input
                  className="input flex-1"
                  placeholder="Type a reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button className="btn-primary" type="submit" disabled={sendingReply}>
                  <ButtonLoading loading={sendingReply} loadingText="Sending...">
                    <Send size={14} />
                  </ButtonLoading>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
