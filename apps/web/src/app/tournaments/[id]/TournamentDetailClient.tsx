"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmtDate } from "@/lib/utils";
import { useToast, handleJoinError } from "@/lib/toast";
import {
  Trophy, AlertTriangle, Settings, BookOpen, ShieldCheck, X,
} from "lucide-react";

interface MatchRules {
  entryFee: number;
  perKillReward: number;
  booyahPrize: number;
  booyahNote?: string;
  eligibility: { minLevel: number; maxHeadshotRate: number; noEmulator: boolean };
  strictlyProhibited: string[];
  violation: string;
  roomSettings: { characterSkill: boolean; gunAttributes: boolean; bannedGuns: string[] };
  importantInstructions: string[];
  importantNotes: string[];
  disclaimer: string;
}

export default function TournamentDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [t, setT] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [showFail, setShowFail] = useState(false);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const url = user ? `/tournaments/${id}/full` : `/tournaments/${id}`;
    setT(await api(url));
  }
  useEffect(() => {
    load();
    if (user) {
      api(`/tournaments/${id}/eligibility`).then(setEligibility).catch(() => {});
    }
  }, [id, user]);

  async function join() {
    if (!user) return router.push("/login");
    if (eligibility && !eligibility.eligible) {
      setShowFail(true);
      return;
    }
    setJoining(true);
    try {
      await api(`/tournaments/${id}/join`, { method: "POST" });
      toast.success("Joined! Upload payment proof to confirm.");
      load();
    } catch (e: any) {
      handleJoinError(e, toast);
      if (/level|headshot|emulator|banned|blacklist/i.test(e?.message ?? "")) {
        setShowFail(true);
      }
    } finally {
      setJoining(false);
    }
  }

  const alreadyJoined = !!t?.participants?.some((p: any) => p.userId === user?.id);

  if (!t) return <p className="text-white/60">Loading…</p>;

  const rules: MatchRules = (t.matchRules as MatchRules) ?? {
    entryFee: t.entryFeeNpr,
    perKillReward: t.perKillReward ?? 0,
    booyahPrize: t.booyahPrize ?? 0,
    booyahNote: "Scales with actual players",
    eligibility: { minLevel: t.minLevel ?? 40, maxHeadshotRate: t.maxHeadshotRate ?? 70, noEmulator: !t.allowEmulator },
    strictlyProhibited: [],
    violation: "No reward + Instant ban",
    roomSettings: { characterSkill: t.characterSkillOn, gunAttributes: t.gunAttributesOn, bannedGuns: t.bannedGuns ?? [] },
    importantInstructions: [],
    importantNotes: [],
    disclaimer: "FireSlot Nepal reserves the right to change rules, prizes, or take action anytime",
  };

  return (
    <div className="space-y-4 pb-24">
      {t.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.coverUrl} alt="" className="w-full h-44 object-cover rounded-lg" />
      ) : (
        <div className="w-full h-32 rounded-lg bg-gradient-to-r from-neon/30 via-neon-purple/20 to-neon-cyan/30 flex items-center justify-center">
          <Trophy className="text-white/40" size={48} />
        </div>
      )}

      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest text-white/50">DESCRIPTION</p>
        <h1 className="font-display text-2xl text-white mt-1">{t.title}</h1>
        <p className="text-xs text-white/60 mt-1">{fmtDate(t.dateTime)}</p>
      </div>

      <Section title="MATCH DETAILS" icon={<BookOpen size={14} />}>
        <Detail label="Entry Fee" value={`Rs ${rules.entryFee}`} />
        <Detail label="Per Kill Reward" value={`Rs ${rules.perKillReward}`} accent />
        <Detail
          label="Booyah Prize"
          value={`Rs ${rules.booyahPrize}`}
          accent
          note={rules.booyahNote}
        />
      </Section>

      <Section title="✅ ELIGIBILITY" icon={<ShieldCheck size={14} />}>
        <Bullet>Minimum Level {rules.eligibility.minLevel} required</Bullet>
        <Bullet>Headshot rate below {rules.eligibility.maxHeadshotRate}% (BR Career)</Bullet>
        {rules.eligibility.noEmulator && <Bullet>Emulator / PC players not allowed</Bullet>}
      </Section>

      {rules.strictlyProhibited?.length > 0 && (
        <Section title="STRICTLY PROHIBITED" icon={<AlertTriangle size={14} className="text-red-400" />}>
          {rules.strictlyProhibited.map((line, i) => <Bullet key={i}>{line}</Bullet>)}
          <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
            🚫 Violation = {rules.violation}
          </p>
        </Section>
      )}

      <Section title="⚙️ ROOM SETTINGS" icon={<Settings size={14} />}>
        <Detail label="Character Skill" value={rules.roomSettings.characterSkill ? "ON" : "OFF"} />
        <Detail label="Gun Attributes" value={rules.roomSettings.gunAttributes ? "ON" : "OFF"} />
        <Detail
          label="Banned Guns"
          value={rules.roomSettings.bannedGuns?.length ? rules.roomSettings.bannedGuns.join(", ") : "None"}
        />
      </Section>

      {rules.importantInstructions?.length > 0 && (
        <Section title="IMPORTANT INSTRUCTIONS" icon={<BookOpen size={14} />}>
          {rules.importantInstructions.map((line, i) => <Bullet key={i}>{line}</Bullet>)}
        </Section>
      )}

      {rules.importantNotes?.length > 0 && (
        <Section title="⚠️ IMPORTANT NOTES" icon={<AlertTriangle size={14} className="text-yellow-300" />}>
          {rules.importantNotes.map((line, i) => (
            <p key={i} className="text-xs text-white/70 flex items-start gap-2">
              <span className="text-yellow-300">⚠️</span> {line}
            </p>
          ))}
          <p className="mt-3 text-xs font-bold text-white">{rules.disclaimer}</p>
        </Section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t border-border bg-bg/95 p-3 backdrop-blur">
        <button
          onClick={join}
          disabled={joining || t.status !== "UPCOMING" || alreadyJoined}
          className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 py-3 font-display text-base text-white shadow-lg disabled:opacity-50"
        >
          {alreadyJoined
            ? "Already Joined"
            : t.status !== "UPCOMING"
              ? t.status
              : joining
                ? "..."
                : `JOIN NOW · Rs ${t.entryFeeNpr}`}
        </button>
        {msg && <p className="mt-2 text-center text-xs text-white/70">{msg}</p>}
      </div>

      {showFail && eligibility && !eligibility.eligible && (
        <FailModal
          message={eligibility.failMessage ?? msg ?? "Not eligible"}
          onClose={() => setShowFail(false)}
          onView={() => {
            setShowFail(false);
            document
              .querySelector("[data-section='✅ ELIGIBILITY']")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

function Section({
  title, icon, children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-display text-sm text-white/90 flex items-center gap-2" data-section={title}>
        {icon} {title}
      </h2>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function Detail({ label, value, accent, note }: { label: string; value: any; accent?: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-xs text-white/60">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${accent ? "text-neon" : "text-white"}`}>{value}</span>
        {note && <p className="text-[10px] text-white/40">{note}</p>}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-white/75 flex gap-2">
      <span className="text-neon-cyan mt-0.5">•</span>
      <span>{children}</span>
    </p>
  );
}

function FailModal({ message, onClose, onView }: { message: string; onClose: () => void; onView: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card relative w-full max-w-sm text-center">
        <button onClick={onClose} className="absolute right-3 top-3 text-white/60">
          <X size={18} />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <X size={24} />
        </div>
        <h3 className="font-display text-lg text-white">Not Eligible</h3>
        <p className="mt-2 text-sm text-white/70">{message}</p>
        <button onClick={onView} className="btn-outline mt-4 w-full">
          View Requirements
        </button>
      </div>
    </div>
  );
}
