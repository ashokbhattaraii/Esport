"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Coins, Plus, Swords, Gamepad2 } from "lucide-react";
import { useToast, handleJoinError } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";

type GameMode = "BR" | "CS" | "ALL";
type Status = "OPEN" | "MATCHED" | "COMPLETED" | "ALL";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-neon-green/20 text-neon-green border-neon-green/40",
  MATCHED: "bg-amber-400/20 text-amber-300 border-amber-400/40",
  ROOM_SHARED: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40",
  ONGOING: "bg-neon-purple/20 text-neon-purple border-neon-purple/40",
  COMPLETED: "bg-white/10 text-white/60 border-border",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/40",
  DISPUTED: "bg-red-500/20 text-red-400 border-red-500/40",
};

export default function ChallengesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("ALL");
  const [status, setStatus] = useState<Status>("OPEN");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (gameMode !== "ALL") params.set("gameMode", gameMode);
    if (status !== "ALL") params.set("status", status);
    setItems(await api(`/challenges?${params}`));
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
          <p className="label">Challenges</p>
          <h1 className="font-display text-2xl text-white flex items-center gap-2">
            <Swords size={20} className="text-neon-orange" /> 1v1 / Squad Matches
          </h1>
        </div>
        <Link href="/challenges/create" className="btn-primary">
          <Plus size={14} /> Create
        </Link>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 text-xs">
          <Pills
            options={["ALL", "BR", "CS"]}
            value={gameMode}
            onChange={(v) => setGameMode(v as GameMode)}
          />
          <Pills
            options={["OPEN", "MATCHED", "COMPLETED", "ALL"]}
            value={status}
            onChange={(v) => setStatus(v as Status)}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-white/50">No challenges in this filter</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const ign = c.creator?.profile?.ign ?? c.creator?.name ?? c.creator?.email;
            const lvl = c.creator?.profile?.level;
            return (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-md bg-purple-700 px-2 py-0.5 text-[10px] font-bold text-white">
                      {c.challengeNumber}
                    </span>
                    <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] text-neon-cyan font-bold">
                      {c.gameMode}
                    </span>
                    {c.gameMode === "CS" ? (
                      <>
                        <span className="text-[10px] text-white/60">{c.csTeamMode}</span>
                        <span className="text-[10px] text-white/60">R{c.csRounds}</span>
                        {c.csCompulsoryWeapon && c.csCompulsoryWeapon !== "NONE" && (
                          <span className="text-[10px] text-yellow-300">⚔ {c.csCompulsoryWeapon}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-white/60">{c.brMap}</span>
                        <span className="text-[10px] text-white/60">{c.brWinCondition}</span>
                      </>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[c.status] ?? ""}`}>
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-purple/20 text-neon-purple">
                      <Gamepad2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{ign}</p>
                      <p className="text-[10px] text-white/40">
                        {lvl ? `Lv ${lvl}` : "—"}
                        {c.minLevel > 0 ? ` · Need Lv${c.minLevel}+` : ""}
                        {c.noEmulator ? " · No emu" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-white/40">Win</p>
                    <p className="font-display text-base text-neon-green">Rs {c.prizeToWinner}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-white/60 flex items-center gap-1">
                    <Coins size={12} /> Rs {c.entryFee} entry
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/challenges/${c.id}`} className="btn-outline text-xs">Details</Link>
                    {c.status === "OPEN" && user?.id !== c.creatorId && (
                      <button
                        disabled={joiningId === c.id}
                        onClick={() => quickJoin(c.id)}
                        className="rounded-md bg-[#E53935] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {joiningId === c.id ? "..." : `JOIN`}
                      </button>
                    )}
                    {c.status === "COMPLETED" && c.winnerId && (
                      <span className="text-[10px] text-neon-green">
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

function Pills({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md px-2 py-1 ${
            value === o ? "bg-neon text-black" : "bg-surface text-white/70"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
