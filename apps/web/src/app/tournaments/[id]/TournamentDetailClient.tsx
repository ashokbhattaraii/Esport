"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmtDate } from "@/lib/utils";
import { useToast, handleJoinError } from "@/lib/toast";
import { useTournamentRealtime } from "@/hooks/useTournamentRealtime";
import { ButtonLoading, PageLoading } from "@/components/ui";
import {
  Trophy, AlertTriangle, Settings, BookOpen, ShieldCheck, X, ArrowLeft,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { roomJustPublished } = useTournamentRealtime(id, {
    onRoomPublished: () => {
      toast.success("Room details are live!");
      load();
    },
    onStatusChanged: () => load(),
  });

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

  if (!t) return <PageLoading label="Loading tournament..." />;

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
    <div className="space-y-4 pb-24 -mx-4">
      {/* Banner */}
      <div className="relative">
        {t.coverUrl ? (
          <img src={t.coverUrl} alt="" className="w-full object-cover" style={{ height: '200px' }} />
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: '200px', background: 'linear-gradient(135deg, var(--fs-surface-2), var(--fs-surface-3))' }}>
            <Trophy size={48} style={{ color: 'var(--fs-text-3)' }} />
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4" style={{ paddingTop: 'calc(var(--fs-safe-top) + 12px)' }}>
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          >
            <ArrowLeft size={18} style={{ color: 'var(--fs-text-1)' }} />
          </button>
          <span className={`fs-badge ${t.status === 'ONGOING' ? 'fs-badge-green' : t.status === 'COMPLETED' ? 'fs-badge-gray' : 'fs-badge-amber'}`}>
            {t.status}
          </span>
        </div>
      </div>

      <div className="px-4">
        <div className="text-center">
          <h1 className="fs-h1">{t.title}</h1>
          <p className="fs-caption mt-1">{fmtDate(t.dateTime)}</p>
        </div>

        {/* Match Info Chips */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <InfoChip label="Entry" value={`Rs ${rules.entryFee}`} />
          <InfoChip label="Per Kill" value={`Rs ${rules.perKillReward}`} />
          <InfoChip label="Booyah" value={`Rs ${rules.booyahPrize}`} />
          <InfoChip label="Players" value={`${t.filledSlots}/${t.maxSlots}`} />
        </div>

        {/* Rules Sections */}
        <Section title="ELIGIBILITY" accent="var(--fs-green)" icon={<ShieldCheck size={14} />}>
          <Bullet>Minimum Level {rules.eligibility.minLevel} required</Bullet>
          <Bullet>Headshot rate below {rules.eligibility.maxHeadshotRate}% (BR Career)</Bullet>
          {rules.eligibility.noEmulator && <Bullet>Emulator / PC players not allowed</Bullet>}
        </Section>

        {rules.strictlyProhibited?.length > 0 && (
          <Section title="STRICTLY PROHIBITED" accent="var(--fs-red)" icon={<AlertTriangle size={14} />}>
            {rules.strictlyProhibited.map((line, i) => <Bullet key={i}>{line}</Bullet>)}
            <p className="mt-2 rounded-md px-3 py-2 text-xs font-bold" style={{ background: 'var(--fs-red-glow)', color: 'var(--fs-red)' }}>
              🚫 Violation = {rules.violation}
            </p>
          </Section>
        )}

        <Section title="ROOM SETTINGS" accent="var(--fs-amber)" icon={<Settings size={14} />}>
          <Detail label="Character Skill" value={rules.roomSettings.characterSkill ? "ON" : "OFF"} />
          <Detail label="Gun Attributes" value={rules.roomSettings.gunAttributes ? "ON" : "OFF"} />
          <Detail
            label="Banned Guns"
            value={rules.roomSettings.bannedGuns?.length ? rules.roomSettings.bannedGuns.join(", ") : "None"}
          />
        </Section>

        {rules.importantInstructions?.length > 0 && (
          <Section title="IMPORTANT INSTRUCTIONS" accent="var(--fs-gold)" icon={<BookOpen size={14} />}>
            {rules.importantInstructions.map((line, i) => <Bullet key={i}>{line}</Bullet>)}
          </Section>
        )}

        {rules.importantNotes?.length > 0 && (
          <Section title="IMPORTANT NOTES" accent="var(--fs-gold)" icon={<AlertTriangle size={14} />}>
            {rules.importantNotes.map((line, i) => (
              <p key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--fs-text-2)' }}>
                <span style={{ color: 'var(--fs-amber)' }}>⚠️</span> {line}
              </p>
            ))}
            <p className="mt-3 text-xs font-bold" style={{ color: 'var(--fs-text-1)' }}>{rules.disclaimer}</p>
          </Section>
        )}
      </div>

      {/* Sticky Join Button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-4"
        style={{
          background: 'rgba(11,11,20,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '0.5px solid var(--fs-border)',
          paddingBottom: 'calc(16px + var(--fs-safe-bottom))',
        }}
      >
        <button
          onClick={join}
          disabled={joining || t.status !== "UPCOMING" || alreadyJoined}
          className="fs-btn fs-btn-primary fs-btn-full"
          style={{
            height: '50px',
            fontSize: '15px',
            background: alreadyJoined ? 'var(--fs-green)' : undefined,
            opacity: (t.status !== "UPCOMING" && !alreadyJoined) ? 0.5 : 1,
          }}
        >
          <ButtonLoading loading={joining} loadingText="Joining...">
            {alreadyJoined
              ? "Already Joined ✓"
              : t.status !== "UPCOMING"
                ? t.status
                : `JOIN NOW · Rs ${t.entryFeeNpr}`}
          </ButtonLoading>
        </button>
        {msg && <p className="mt-2 text-center text-xs" style={{ color: 'var(--fs-text-3)' }}>{msg}</p>}
      </div>

      {showFail && eligibility && !eligibility.eligible && (
        <FailModal
          message={eligibility.failMessage ?? msg ?? "Not eligible"}
          onClose={() => setShowFail(false)}
          onView={() => {
            setShowFail(false);
            document
              .querySelector("[data-section='ELIGIBILITY']")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center rounded-lg p-2" style={{ background: 'var(--fs-surface-1)', border: '0.5px solid var(--fs-border)' }}>
      <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--fs-text-3)' }}>{label}</p>
      <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--fs-text-1)' }}>{value}</p>
    </div>
  );
}

function Section({
  title, accent, icon, children,
}: { title: string; accent: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="fs-card mt-4 overflow-visible">
      <div className="flex" style={{ borderLeft: `3px solid ${accent}` }}>
        <div className="p-4 w-full">
          <h2 className="text-xs font-bold flex items-center gap-2" style={{ color: 'var(--fs-text-2)' }} data-section={title}>
            {icon} {title}
          </h2>
          <div className="mt-2 space-y-1.5">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '0.5px solid var(--fs-border)' }}>
      <span className="text-xs" style={{ color: 'var(--fs-text-3)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>{value}</span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs flex gap-2" style={{ color: 'var(--fs-text-2)' }}>
      <span style={{ color: 'var(--fs-green)' }}>•</span>
      <span>{children}</span>
    </p>
  );
}

function FailModal({ message, onClose, onView }: { message: string; onClose: () => void; onView: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="fs-card fs-card-body relative w-full text-center" style={{ maxWidth: '340px' }}>
        <button onClick={onClose} className="absolute right-3 top-3" style={{ color: 'var(--fs-text-3)' }}>
          <X size={18} />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--fs-red-glow)' }}>
          <X size={24} style={{ color: 'var(--fs-red)' }} />
        </div>
        <h3 className="fs-h3">Not Eligible</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--fs-text-2)' }}>{message}</p>
        <button onClick={onView} className="fs-btn fs-btn-outline fs-btn-full mt-4">
          View Requirements
        </button>
      </div>
    </div>
  );
}
