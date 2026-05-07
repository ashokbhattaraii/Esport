"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  GameModeLabels,
  TournamentTypeLabels,
  calculateKillPrize,
  type TournamentType,
} from "@fireslot/shared";
import { fmtDate, npr } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Trophy, Users, Calendar, Skull, Gift } from "lucide-react";
import { StatusBadge } from "./ui";

export function TournamentCard({ t }: { t: any }) {
  const full = t.filledSlots >= t.maxSlots;
  const playerFee = t.entryFeeNpr;
  const type = (t.type ?? "SOLO_1ST") as TournamentType;
  const perKill = t.killPrize ?? t.perKillPrizeNpr ?? calculateKillPrize(playerFee);
  const isFree = type === "FREE_DAILY";
  const isKillRace = type === "KILL_RACE";
  const topPrize = t.firstPrize || t.prizePoolNpr;

  const { user } = useAuth();
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!isFree || !user) return;
    api("/tournaments/free-daily/eligibility")
      .then((r: any) => setNextAt(r.eligible ? null : r.nextWindowAt ?? r.nextAvailableAt))
      .catch(() => {});
  }, [isFree, user]);

  useEffect(() => {
    if (!nextAt) return;
    const tick = () => {
      const ms = new Date(nextAt).getTime() - Date.now();
      if (ms <= 0) {
        setNextAt(null);
        setCountdown("");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextAt]);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="card relative overflow-hidden hover:shadow-neon transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="label">
            {GameModeLabels[t.mode as keyof typeof GameModeLabels]}
          </p>
          <h3 className="font-display text-lg text-white">{t.title}</h3>
          <span className="mt-1 inline-block rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] text-neon-cyan">
            {TournamentTypeLabels[type]}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={t.status} />
          {isFree && (
            <span className="inline-flex items-center gap-1 rounded-md border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[10px] text-neon-green">
              <Gift size={10} /> FREE • 1/24h
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat
          icon={isKillRace ? <Skull size={14} /> : <Trophy size={14} />}
          label={isKillRace ? "Per Kill" : "Top Prize"}
          value={isKillRace ? npr(perKill) : npr(topPrize)}
          accent="neon"
        />
        <Stat
          icon={<Skull size={14} />}
          label="Kill"
          value={npr(perKill)}
          accent="cyan"
        />
        <Stat
          icon={<Users size={14} />}
          label="Fee"
          value={isFree ? "FREE" : npr(playerFee)}
          accent="purple"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <Stat
          icon={<Trophy size={14} />}
          label="Pool"
          value={npr(t.prizePoolNpr)}
          accent="neon"
        />
        <Stat
          icon={<Users size={14} />}
          label="Slots"
          value={`${t.filledSlots}/${t.maxSlots}`}
          accent="cyan"
        />
        <Stat
          icon={<Calendar size={14} />}
          label="Date"
          value={fmtDate(t.dateTime)}
          accent="purple"
        />
      </div>

      {isFree && nextAt && (
        <div className="mt-3 rounded-md border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-300">
          Next free slot in {countdown}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-white/70">
          {isFree
            ? "No payment required"
            : `Includes reg ${npr(t.registrationFeeNpr ?? 10)}`}
        </span>
        <Link
          href={`/tournaments/${t.id}`}
          className={
            full || (isFree && nextAt)
              ? "btn-outline opacity-60 pointer-events-none"
              : "btn-primary"
          }
        >
          {full ? "Full" : isFree && nextAt ? "Used" : "Join Now"}
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, accent }: any) {
  const c =
    accent === "neon"
      ? "text-neon"
      : accent === "cyan"
        ? "text-neon-cyan"
        : "text-neon-purple";
  return (
    <div>
      <div className={`flex items-center gap-1 ${c}`}>
        {icon}
        <span className="label">{label}</span>
      </div>
      <div className="text-white text-sm font-medium truncate">{value}</div>
    </div>
  );
}
