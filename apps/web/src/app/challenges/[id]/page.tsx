"use client";
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Gamepad2, Swords, Trophy, ShieldCheck, AlertTriangle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast, handleJoinError } from "@/lib/toast";
import { ButtonLoading, PageLoading } from "@/components/ui";

const REASONS = [
  { val: "SUSPECTED_HACKER", label: "Suspected Hacker" },
  { val: "TEAMING", label: "Teaming" },
  { val: "GLITCH_ABUSE", label: "Glitch Abuse" },
  { val: "WRONG_RESULT", label: "Wrong Result" },
  { val: "DISCONNECTION", label: "Disconnection" },
  { val: "OTHER", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-neon-green/20 text-neon-green border-neon-green/40",
  MATCHED: "bg-amber-400/20 text-amber-300 border-amber-400/40",
  ROOM_SHARED: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40",
  ONGOING: "bg-neon-purple/20 text-neon-purple border-neon-purple/40",
  COMPLETED: "bg-white/10 text-white/70 border-border",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/40",
  DISPUTED: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
};

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [c, setC] = useState<any>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // result form
  const [result, setResult] = useState({
    kills: 0, headshots: 0, damage: 0, mins: 0, secs: 0,
    gotBooyah: false, screenshotUrl: "", povUrl: "",
  });

  // dispute form
  const [dispute, setDispute] = useState({
    reason: "SUSPECTED_HACKER",
    description: "",
    evidenceUrls: [""],
  });

  // share room form
  const [room, setRoom] = useState({ roomId: "", password: "" });

  async function load() {
    try { setC(await api(`/challenges/${id}`)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  if (loading || !c) return <PageLoading label="Loading challenge..." />;

  const isCreator = user?.id === c.creatorId;
  const isOpponent = user?.id === c.opponentId;
  const isPart = isCreator || isOpponent;
  const myResult = c.results?.find((r: any) => r.userId === user?.id);

  async function join() {
    if (!user) return router.push("/login");
    if (!agreed) return toast.warning("You must agree to the rules first.");
    setJoining(true);
    try {
      await api(`/challenges/${c.id}/join`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Joined! Room details coming soon.");
      setShowRulesModal(false);
      load();
    } catch (e: any) {
      handleJoinError(e, toast);
    } finally {
      setJoining(false);
    }
  }

  async function submitRoom() {
    setRoomSubmitting(true);
    try {
      await api(`/challenges/${c.id}/room`, {
        method: "POST",
        body: JSON.stringify(room),
      });
      toast.success("Room shared with opponent.");
      setRoom({ roomId: "", password: "" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRoomSubmitting(false);
    }
  }

  async function submitResult() {
    setResultSubmitting(true);
    try {
      await api(`/challenges/${c.id}/result`, {
        method: "POST",
        body: JSON.stringify({
          kills: result.kills,
          headshots: result.headshots,
          damage: result.damage,
          survivalTimeSecs: result.mins * 60 + result.secs,
          gotBooyah: result.gotBooyah,
          screenshotUrl: result.screenshotUrl || undefined,
          povUrl: result.povUrl || undefined,
        }),
      });
      toast.success("Result submitted.");
      setShowResult(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResultSubmitting(false);
    }
  }

  async function submitDispute() {
    setDisputeSubmitting(true);
    try {
      await api(`/challenges/${c.id}/dispute`, {
        method: "POST",
        body: JSON.stringify({
          reason: dispute.reason,
          description: dispute.description,
          evidenceUrls: dispute.evidenceUrls.filter(Boolean),
        }),
      });
      toast.success("Dispute submitted. Admin review pending.");
      setShowDispute(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDisputeSubmitting(false);
    }
  }

  const creatorIgn = c.creator?.profile?.ign ?? c.creator?.name ?? c.creator?.email;
  const opponentIgn = c.opponent?.profile?.ign ?? c.opponent?.name ?? c.opponent?.email;

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-purple-700 px-2 py-0.5 text-[10px] font-bold text-white">
            {c.challengeNumber}
          </span>
          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[c.status] ?? ""}`}>
            {c.status}
          </span>
        </div>
        <h1 className="mt-2 font-display text-xl text-white">{c.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge>{c.gameMode}</Badge>
          {c.gameMode === "CS" ? (
            <>
              <Badge>{c.csTeamMode}</Badge>
              <Badge>R{c.csRounds}</Badge>
            </>
          ) : c.gameMode === "LW" ? (
            <>
              <Badge>{c.lwTeamMode}</Badge>
              <Badge>Lone Wolf</Badge>
            </>
          ) : (
            <>
              <Badge>{c.brMap}</Badge>
              <Badge>{c.brWinCondition}</Badge>
            </>
          )}
        </div>

        {/* Players */}
        <div className="mt-4 flex items-center justify-between">
          <Player ign={creatorIgn} role="Creator" />
          <Swords size={20} className="text-neon-orange" />
          {c.opponent ? (
            <Player ign={opponentIgn} role="Opponent" />
          ) : (
            <div className="text-right">
              <p className="text-xs text-white/50 animate-pulse">Waiting for opponent…</p>
            </div>
          )}
        </div>
      </div>

      {/* Prize */}
      <div className="card">
        <h2 className="font-display text-sm flex items-center gap-1"><Trophy size={14} className="text-neon" /> Prize</h2>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-white/70">Winner Prize</span>
          <span className="font-bold text-neon-green">Rs {c.prizeToWinner}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Entry Fee</span><span>Rs {c.entryFee} each</span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Platform Fee</span><span>Rs {c.platformFee}</span>
        </div>
      </div>

      {/* Rules — auto-generated from challenge settings */}
      <RulesSection challenge={c} />

      {/* Anti-cheat */}
      <div className="card">
        <h2 className="font-display text-sm flex items-center gap-1">
          <ShieldCheck size={14} className="text-neon-cyan" /> ANTI-CHEAT RULES
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
          <li>Screen recording (POV) MANDATORY throughout the match</li>
          <li>Screenshot of final results REQUIRED for result submission</li>
          <li>If you suspect opponent is hacking: record evidence immediately</li>
          <li>Disputes must be raised within {c.reportWindowMins} minutes of match end</li>
          <li>Providing false evidence = permanent ban</li>
          <li>If proven hacker: full refund + opponent wins automatically</li>
        </ul>
      </div>

      {/* Important notes */}
      <div className="card">
        <h2 className="font-display text-sm flex items-center gap-1">
          <AlertTriangle size={14} className="text-yellow-300" /> IMPORTANT NOTES
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
          <li>Room ID & Password shared after both players join</li>
          <li>Late join = forfeit, no refund</li>
          <li>Unregistered players in room = disqualification</li>
          <li>FireSlot Nepal reserves the right to change outcome with sufficient evidence</li>
        </ul>
      </div>

      {/* Room details (visible after share) */}
      {(c.status === "ROOM_SHARED" || c.status === "ONGOING" || c.status === "PENDING_RESULTS")
        && isPart && c.roomId && (
        <div className="card">
          <h2 className="font-display text-sm">Room</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Box label="Room ID" value={c.roomId} />
            <Box label="Password" value={c.roomPassword} />
          </div>
        </div>
      )}

      {/* Creator: share room */}
      {isCreator && c.status === "MATCHED" && (
        <div className="card">
          <h2 className="font-display text-sm">Share Room Details</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input className="input" placeholder="Room ID" value={room.roomId} onChange={(e) => setRoom({ ...room, roomId: e.target.value })} />
            <input className="input" placeholder="Password" value={room.password} onChange={(e) => setRoom({ ...room, password: e.target.value })} />
          </div>
          <button
            onClick={submitRoom}
            className="btn-primary mt-3 w-full"
            disabled={roomSubmitting}
          >
            <ButtonLoading loading={roomSubmitting} loadingText="Sharing room...">
              Send to opponent
            </ButtonLoading>
          </button>
        </div>
      )}

      {/* Submit / dispute (participants only) */}
      {isPart && (c.status === "ROOM_SHARED" || c.status === "ONGOING" || c.status === "PENDING_RESULTS" || c.status === "DISPUTED") && (
        <div className="flex gap-2">
          {!myResult && (
            <button onClick={() => setShowResult(true)} className="btn-primary flex-1">Submit Result</button>
          )}
          <button onClick={() => setShowDispute(true)} className="btn-outline flex-1">Raise Dispute</button>
        </div>
      )}

      {/* Sticky JOIN button */}
      {!isPart && c.status === "OPEN" && (
        <button
          onClick={() => setShowRulesModal(true)}
          className="fixed bottom-0 left-0 right-0 z-40 mx-auto block w-full max-w-md rounded-t-lg bg-[#E53935] py-4 font-display text-base font-bold text-white shadow-2xl"
        >
          JOIN CHALLENGE · Rs {c.entryFee}
        </button>
      )}

      {/* Rules modal */}
      {showRulesModal && (
        <Modal onClose={() => setShowRulesModal(false)}>
          <div className="rounded-md bg-purple-900/40 px-3 py-2 mb-3 flex items-center gap-2">
            <Gamepad2 size={14} />
            <span className="text-sm">{creatorIgn}'s Match</span>
          </div>
          <h3 className="font-display text-base text-white mb-2">Match Rules</h3>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-3 text-xs text-white/80">
            {c.rulesText}
          </pre>
          <label className="mt-3 flex items-start gap-2 text-xs text-white/80">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>I have read and agree to all rules</span>
          </label>
          <button
            onClick={join}
            disabled={!agreed || joining}
            className="mt-3 w-full rounded-lg bg-[#E53935] py-3 font-display text-sm font-bold text-white disabled:opacity-50"
          >
            <ButtonLoading loading={joining} loadingText="Joining...">
              JOIN · Rs {c.entryFee}
            </ButtonLoading>
          </button>
        </Modal>
      )}

      {/* Result modal */}
      {showResult && (
        <Modal onClose={() => setShowResult(false)}>
          <h3 className="font-display text-lg text-white mb-3">Submit Result</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <NumberField label="Kills" value={result.kills} onChange={(v) => setResult({ ...result, kills: v })} />
            <NumberField label="Headshots" value={result.headshots} onChange={(v) => setResult({ ...result, headshots: v })} />
            <NumberField label="Damage" value={result.damage} onChange={(v) => setResult({ ...result, damage: v })} />
            <div className="flex gap-1">
              <NumberField label="Survival mm" value={result.mins} onChange={(v) => setResult({ ...result, mins: v })} />
              <NumberField label="ss" value={result.secs} onChange={(v) => setResult({ ...result, secs: v })} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-white/80">
              <input type="checkbox" checked={result.gotBooyah} onChange={(e) => setResult({ ...result, gotBooyah: e.target.checked })} />
              Got Booyah?
            </label>
            <input
              className="input col-span-2"
              placeholder={c.screenshotRequired ? "Screenshot URL (required)" : "Screenshot URL"}
              value={result.screenshotUrl}
              onChange={(e) => setResult({ ...result, screenshotUrl: e.target.value })}
            />
            <input
              className="input col-span-2"
              placeholder={c.povRequired ? "POV recording URL (required)" : "POV URL"}
              value={result.povUrl}
              onChange={(e) => setResult({ ...result, povUrl: e.target.value })}
            />
          </div>
          <button
            onClick={submitResult}
            className="btn-primary mt-3 w-full"
            disabled={resultSubmitting}
          >
            <ButtonLoading loading={resultSubmitting} loadingText="Submitting result...">
              Submit
            </ButtonLoading>
          </button>
        </Modal>
      )}

      {/* Dispute modal */}
      {showDispute && (
        <Modal onClose={() => setShowDispute(false)}>
          <h3 className="font-display text-lg text-white mb-2">Raise Dispute</h3>
          <p className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
            False disputes = ban. Provide real proof only.
          </p>
          <select
            className="input mb-2"
            value={dispute.reason}
            onChange={(e) => setDispute({ ...dispute, reason: e.target.value })}
          >
            {REASONS.map((r) => (
              <option key={r.val} value={r.val}>{r.label}</option>
            ))}
          </select>
          <textarea
            className="input"
            rows={3}
            placeholder="Describe the issue"
            value={dispute.description}
            onChange={(e) => setDispute({ ...dispute, description: e.target.value })}
          />
          {dispute.evidenceUrls.map((url, i) => (
            <input
              key={i}
              className="input mt-2"
              placeholder="Evidence URL (screenshot/recording)"
              value={url}
              onChange={(e) => {
                const arr = [...dispute.evidenceUrls];
                arr[i] = e.target.value;
                setDispute({ ...dispute, evidenceUrls: arr });
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setDispute({ ...dispute, evidenceUrls: [...dispute.evidenceUrls, ""] })}
            className="btn-outline mt-2 text-xs"
          >
            + Add evidence URL
          </button>
          <button
            onClick={submitDispute}
            className="btn-primary mt-3 w-full"
            disabled={disputeSubmitting}
          >
            <ButtonLoading loading={disputeSubmitting} loadingText="Submitting dispute...">
              Submit Dispute
            </ButtonLoading>
          </button>
        </Modal>
      )}
    </div>
  );
}

function RulesSection({ challenge: c }: { challenge: any }) {
  const isCS = c.gameMode === "CS";
  return (
    <div className="card">
      <h2 className="font-display text-sm">MATCH SETTINGS</h2>
      <div className="mt-2 space-y-1 text-xs">
        {isCS ? (
          <>
            <Row label="Team Mode" value={c.csTeamMode} />
            <Row label="Rounds" value={c.csRounds} />
            <Row label="Coins" value={c.csCoins} />
            <Row label="Throwable" value={c.csThrowable ? "Yes" : "No"} />
            <Row label="Character Skill" value={c.characterSkill ? "Yes" : "No"} />
            <Row label="Gun Attribute" value={c.gunAttribute ? "Yes" : "No"} />
            <Row label="Headshot Only" value={c.headshotOnly ? "Yes" : "No"} />
            <Row label="Loadout" value={c.csLoadout ? "Yes" : "No"} />
            {c.csCompulsoryWeapon && c.csCompulsoryWeapon !== "NONE" && (
              <Row label="Compulsory Weapon" value={c.csCompulsoryWeapon} accent />
            )}
            {c.csCompulsoryArmour && c.csCompulsoryArmour !== "NONE" && (
              <Row label="Compulsory Armour" value={c.csCompulsoryArmour} accent />
            )}
          </>
        ) : c.gameMode === "LW" ? (
          <>
            <Row label="Mode" value="Lone Wolf" />
            <Row label="Team Mode" value={c.lwTeamMode} />
            <Row label="Headshot Only" value={c.headshotOnly ? "Yes" : "No"} />
          </>
        ) : (
          <>
            <Row label="Map" value={c.brMap} />
            <Row label="Mode" value={c.brTeamMode} />
            <Row label="Win Condition" value={c.brWinCondition} accent />
            {c.brWinCondition === "FIRST_TO_N_KILLS" && (
              <Row label="Target Kills" value={c.brTargetKills} accent />
            )}
            {c.brBannedGuns?.length > 0 && (
              <Row label="Banned Guns" value={c.brBannedGuns.join(", ")} />
            )}
            <Row label="Headshot Only" value={c.brHeadshotOnly ? "Yes" : "No"} />
          </>
        )}
        <Row label="No Emulator" value={c.noEmulator ? "Yes" : "No"} />
        {c.minLevel > 0 && <Row label="Min Level" value={c.minLevel} />}
        {c.maxHeadshotRate < 100 && <Row label="Max HS Rate" value={`${c.maxHeadshotRate}%`} />}
      </div>
    </div>
  );
}

// ----------- UI primitives -----------
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] text-neon-cyan">{children}</span>;
}
function Player({ ign, role }: { ign: string; role: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neon-purple/20 text-neon-purple">
        <Gamepad2 size={16} />
      </div>
      <p className="mt-1 text-xs text-white">{ign}</p>
      <p className="text-[10px] text-white/40">{role}</p>
    </div>
  );
}
function Box({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-neon/40 bg-neon/5 px-2 py-1 text-center">
      <p className="text-[10px] text-white/50">{label}</p>
      <p className="font-mono text-sm text-neon">{value ?? "—"}</p>
    </div>
  );
}
function Row({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 py-1 last:border-0">
      <span className="text-white/60">{label}</span>
      <span className={accent ? "text-neon font-semibold" : "text-white"}>{value}</span>
    </div>
  );
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-[10px] text-white/50">{label}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </div>
  );
}
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-3 sm:items-center">
      <div className="card relative w-full max-w-md">
        <button onClick={onClose} className="absolute right-3 top-3 text-white/60">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
