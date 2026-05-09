"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Coins, Plus, Swords, Gamepad2 } from "lucide-react";
import { useToast, handleJoinError } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { ButtonLoading, CardSkeleton, LoadingState } from "@/components/ui";

type GameMode = "BR" | "CS" | "ALL";
type Status = "OPEN" | "MATCHED" | "COMPLETED" | "ALL";

export default function ChallengesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("ALL");
  const [status, setStatus] = useState<Status>("OPEN");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (gameMode !== "ALL") params.set("gameMode", gameMode);
    if (status !== "ALL") params.set("status", status);
    setErr(null);
    setLoading(true);
    try {
      setItems(await api(`/challenges?${params}`));
    } catch (e: any) {
      setErr(e.message ?? "Could not load challenges");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load().catch(() => {}); }, [gameMode, status]);

  async function quickJoin(id: string) {
    if (!user) return toast.warning("Please sign in to join.");
    setJoiningId(id);
    try {
      await api(`/challenges/${id}/join`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Joined!");
      load();
    } catch (e: any) {
      handleJoinError(e, toast);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="fs-h2 flex items-center gap-2">
            <Swords size={20} style={{ color: 'var(--fs-red)' }} /> Challenges
          </h1>
          <p className="fs-caption mt-0.5">1v1 / Squad Matches</p>
        </div>
        <Link href="/challenges/create" className="fs-btn fs-btn-primary fs-btn-sm">
          <Plus size={14} /> Create
        </Link>
      </div>

      {/* Filters */}
      <div className="fs-card fs-card-body">
        <div className="flex flex-wrap gap-2">
          <FilterPills
            options={["ALL", "BR", "CS"]}
            value={gameMode}
            onChange={(v) => setGameMode(v as GameMode)}
          />
          <FilterPills
            options={["OPEN", "MATCHED", "COMPLETED", "ALL"]}
            value={status}
            onChange={(v) => setStatus(v as Status)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="fs-skeleton" style={{ height: '120px' }} />
          <div className="fs-skeleton" style={{ height: '120px' }} />
          <div className="fs-skeleton" style={{ height: '120px' }} />
        </div>
      ) : err ? (
        <LoadingState label={err} />
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: 'var(--fs-text-3)' }}>No challenges in this filter</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const ign = c.creator?.profile?.ign ?? c.creator?.name ?? c.creator?.email;
            const lvl = c.creator?.profile?.level;
            const statusBadgeClass = c.status === "OPEN" ? "fs-badge-green"
              : c.status === "MATCHED" || c.status === "ONGOING" ? "fs-badge-amber"
              : c.status === "COMPLETED" ? "fs-badge-gray"
              : "fs-badge-red";

            return (
              <div key={c.id} className="fs-card fs-card-body">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="fs-badge" style={{ background: 'rgba(156,39,176,0.15)', color: '#CE93D8' }}>
                      CH-{c.challengeNumber}
                    </span>
                    <span className={`fs-badge ${c.gameMode === "BR" ? "fs-badge-red" : "fs-badge-gold"}`}>
                      {c.gameMode}
                    </span>
                    {c.gameMode === "CS" ? (
                      <span className="fs-badge fs-badge-gray">{c.csTeamMode}</span>
                    ) : (
                      <span className="fs-badge fs-badge-gray">{c.brMap}</span>
                    )}
                  </div>
                  <span className={`fs-badge ${statusBadgeClass}`}>
                    {c.status}
                  </span>
                </div>

                {/* VS Row */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: 'var(--fs-surface-3)' }}
                    >
                      <Gamepad2 size={16} style={{ color: 'var(--fs-text-2)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>{ign}</p>
                      <p className="text-[10px]" style={{ color: 'var(--fs-text-3)' }}>
                        {lvl ? `Lv ${lvl}` : "—"}
                        {c.minLevel > 0 ? ` · Need Lv${c.minLevel}+` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: 'var(--fs-text-3)' }}>VS</span>
                  <div className="text-right">
                    <span className="text-sm" style={{ color: 'var(--fs-text-3)' }}>???</span>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="mt-3 flex items-center justify-between" style={{ borderTop: '0.5px solid var(--fs-border)', paddingTop: '10px' }}>
                  <div className="flex items-center gap-3 text-xs">
                    <span style={{ color: 'var(--fs-text-3)' }}>
                      <Coins size={12} className="inline mr-1" />Entry Rs {c.entryFee}
                    </span>
                    <span style={{ color: 'var(--fs-green)' }}>Prize Rs {c.prizeToWinner}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/challenges/${c.id}`} className="fs-btn fs-btn-outline fs-btn-sm">Details</Link>
                    {c.status === "OPEN" && user?.id !== c.creatorId && (
                      <button
                        disabled={joiningId === c.id}
                        onClick={() => quickJoin(c.id)}
                        className="fs-btn fs-btn-primary fs-btn-sm"
                      >
                        <ButtonLoading loading={joiningId === c.id} loadingText="...">
                          JOIN
                        </ButtonLoading>
                      </button>
                    )}
                    {c.status === "COMPLETED" && c.winnerId && (
                      <span className="fs-badge fs-badge-gold">
                        Winner: {c.winnerId === c.creatorId ? ign : "Opponent"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPills({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
          style={{
            background: value === o ? 'var(--fs-red)' : 'var(--fs-surface-2)',
            color: value === o ? '#fff' : 'var(--fs-text-3)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
