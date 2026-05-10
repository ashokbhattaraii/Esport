"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Coins, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast, handleJoinError } from "@/lib/toast";
import { ButtonLoading } from "@/components/ui";

type GameMode = "BR" | "CS" | "LW";

const CS_TEAM_MODES = ["1v1", "2v2", "3v3", "4v4"];
const LW_TEAM_MODES = ["1v1", "2v2"];
const CS_WEAPONS = [
  "NONE", "MP40", "UMP", "MP5", "BIZON", "VECTOR", "M1014", "M1887",
  "MAG7", "M590", "AWM", "XM8", "D-EAGLE", "WOODPECKER",
];
const CS_ARMOURS = [
  { val: "NONE", label: "None" },
  { val: "VEST_LV2", label: "Vest lvl2" },
  { val: "VEST_LV3", label: "Vest lvl3" },
  { val: "VEST_LV4", label: "Vest lvl4" },
  { val: "HELMET_LV2", label: "Helmet lvl2" },
  { val: "HELMET_LV3", label: "Helmet lvl3" },
];

const BR_MAPS = ["BERMUDA", "KALAHARI", "PURGATORY", "NEXTERRA"];
const BR_TEAM_MODES = ["SOLO", "DUO", "SQUAD"];
const BR_WIN_CONDITIONS = [
  { val: "KILLS", label: "Most Kills" },
  { val: "BOOYAH", label: "Booyah" },
  { val: "HEADSHOTS_ONLY", label: "Headshots Only" },
  { val: "MOST_DAMAGE", label: "Most Damage" },
  { val: "SURVIVAL_TIME", label: "Survival Time" },
  { val: "FIRST_TO_N_KILLS", label: "First to N Kills" },
];
const BR_BANNED_OPTS = [
  "Double Vector", "M79", "Grenade Launcher", "Rocket Launcher", "SPAS-12",
];

export default function CreateChallengePage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [gameMode, setGameMode] = useState<GameMode>("CS");
  const [entryFee, setEntryFee] = useState(15);
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [csTeamMode, setCsTeamMode] = useState("1v1");
  const [csThrowable, setCsThrowable] = useState(true);
  const [characterSkill, setCharacterSkill] = useState(true);
  const [gunAttribute, setGunAttribute] = useState(false);
  const [headshotOnly, setHeadshotOnly] = useState(false);
  const [csRounds, setCsRounds] = useState<7 | 13>(7);
  const [csCoins, setCsCoins] = useState<"DEFAULT" | "9980">("DEFAULT");
  const [csLoadout, setCsLoadout] = useState(false);
  const [csCompulsoryWeapon, setCsCompulsoryWeapon] = useState("NONE");
  const [csCompulsoryArmour, setCsCompulsoryArmour] = useState("NONE");
  const [lwTeamMode, setLwTeamMode] = useState("1v1");

  const [brMap, setBrMap] = useState("BERMUDA");
  const [brTeamMode, setBrTeamMode] = useState("SOLO");
  const [brWinCondition, setBrWinCondition] = useState("KILLS");
  const [brTargetKills, setBrTargetKills] = useState(5);
  const [brBannedGuns, setBrBannedGuns] = useState<string[]>([]);

  const [showElig, setShowElig] = useState(false);
  const [showAntiCheat, setShowAntiCheat] = useState(false);
  const [minLevel, setMinLevel] = useState(0);
  const [noEmulator, setNoEmulator] = useState(true);
  const [povRequired, setPovRequired] = useState(true);
  const [screenshotRequired, setScreenshotRequired] = useState(true);
  const [reportWindowMins, setReportWindowMins] = useState(60);

  const [submitting, setSubmitting] = useState(false);

  const csPlayerCount = useMemo(() => {
    if (gameMode !== "CS") return 2;
    const size = csTeamMode === "4v4" ? 4 : csTeamMode === "2v2" ? 2 : 1;
    return size * 2;
  }, [gameMode, csTeamMode]);

  const prizeToWinner = useMemo(() => {
    const players = gameMode === "CS" ? csPlayerCount : gameMode === "LW" ? 2 : 2;
    return Math.floor(entryFee * players * 0.8);
  }, [entryFee, gameMode, csPlayerCount]);

  const igName = user?.profile?.ign ?? user?.name ?? user?.email ?? "Player";

  async function submit() {
    if (!user) return router.push("/login");
    setSubmitting(true);
    try {
      const payload: any = {
        title: title || `${igName}'s ${gameMode} Match`,
        gameMode,
        entryFee,
        isPrivate,
        characterSkill,
        gunAttribute,
        headshotOnly,
        noEmulator,
        minLevel,
        povRequired,
        screenshotRequired,
        reportWindowMins,
      };
      if (gameMode === "CS") {
        Object.assign(payload, {
          csTeamMode,
          csRounds,
          csCoins,
          csThrowable,
          csLoadout,
          csCompulsoryWeapon,
          csCompulsoryArmour,
        });
      } else if (gameMode === "LW") {
        Object.assign(payload, {
          lwTeamMode,
        });
      } else {
        Object.assign(payload, {
          brMap,
          brTeamMode,
          brWinCondition,
          brTargetKills:
            brWinCondition === "FIRST_TO_N_KILLS" ? brTargetKills : undefined,
          brBannedGuns,
        });
      }
      const created: any = await api("/challenges", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`Challenge ${created.challengeNumber} created!`);
      router.push(`/challenges/${created.id}`);
    } catch (e: any) {
      handleJoinError(e, toast);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-32 -mx-4 px-4" style={{ background: 'var(--fs-bg)', minHeight: '100vh' }}>
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-3">
        <StepDot active />
        <div className="h-px w-8" style={{ background: 'var(--fs-border-md)' }} />
        <StepDot active={gameMode !== undefined} />
        <div className="h-px w-8" style={{ background: 'var(--fs-border-md)' }} />
        <StepDot active={entryFee > 0} />
      </div>

      {/* IGN bar */}
      <div className="fs-card fs-card-body flex items-center gap-2">
        <Gamepad2 size={18} style={{ color: 'var(--fs-red)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>{igName}</span>
      </div>

      {/* Entry fee */}
      <div className="fs-card fs-card-body">
        <label className="fs-label flex items-center gap-1"><Coins size={12} /> Entry Fee</label>
        <input
          type="range"
          min={20}
          max={50}
          step={5}
          value={entryFee}
          onChange={(e) => setEntryFee(Number(e.target.value))}
          className="w-full mt-2"
          style={{ accentColor: 'var(--fs-gold)' }}
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span style={{ color: 'var(--fs-text-2)' }}>Rs {entryFee}</span>
          <span style={{ color: 'var(--fs-gold)' }}>Winner gets <b>Rs {prizeToWinner}</b></span>
        </div>
      </div>

      {/* Prize preview card */}
      <div className="rounded-xl p-4 text-center" style={{ background: 'var(--fs-gold-dim)', border: '1px solid rgba(255,215,0,0.2)' }}>
        <p className="text-lg font-bold" style={{ color: 'var(--fs-gold)' }}>Winner gets Rs {prizeToWinner}</p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--fs-text-3)' }}>Platform fee: Rs {Math.floor(entryFee * 2 * 0.2)}</p>
      </div>

      {/* Game mode tabs */}
      <div className="fs-card fs-card-body">
        <label className="fs-label">Game Mode</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={() => setGameMode("BR")}
            className={`fs-opt ${gameMode === "BR" ? "active" : ""}`}
          >
            Battle Royale
          </button>
          <button
            type="button"
            onClick={() => setGameMode("CS")}
            className={`fs-opt ${gameMode === "CS" ? "active" : ""}`}
          >
            Clash Squad
          </button>
          <button
            type="button"
            onClick={() => setGameMode("LW")}
            className={`fs-opt ${gameMode === "LW" ? "active" : ""}`}
          >
            Lone Wolf
          </button>
        </div>
      </div>

      {gameMode === "CS" ? (
        <>
          <OptSection label="Team Mode">
            <div className="fs-opt-grid">
              {CS_TEAM_MODES.map((m) => (
                <button key={m} type="button" className={`fs-opt ${csTeamMode === m ? "active" : ""}`} onClick={() => setCsTeamMode(m)}>{m}</button>
              ))}
            </div>
          </OptSection>

          <YesNo label="Throwable Limit" value={csThrowable} onChange={setCsThrowable} />
          <YesNo label="Character Skill" value={characterSkill} onChange={setCharacterSkill} />
          <YesNo label="Gun Attribute" value={gunAttribute} onChange={setGunAttribute} />
          <YesNo label="Headshot Only" value={headshotOnly} onChange={setHeadshotOnly} reversed />

          <OptSection label="Rounds">
            <div className="fs-opt-grid">
              <button type="button" className={`fs-opt ${csRounds === 7 ? "active" : ""}`} onClick={() => setCsRounds(7)}>7</button>
              <button type="button" className={`fs-opt ${csRounds === 13 ? "active" : ""}`} onClick={() => setCsRounds(13)}>13</button>
            </div>
          </OptSection>

          <OptSection label="Coins">
            <div className="fs-opt-grid">
              <button type="button" className={`fs-opt ${csCoins === "DEFAULT" ? "active" : ""}`} onClick={() => setCsCoins("DEFAULT")}>Default</button>
              <button type="button" className={`fs-opt ${csCoins === "9980" ? "active" : ""}`} onClick={() => setCsCoins("9980")}>9980</button>
            </div>
          </OptSection>

          <YesNo label="Loadout" value={csLoadout} onChange={setCsLoadout} />

          <OptSection label="Compulsory Weapon">
            <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {CS_WEAPONS.map((w) => (
                <button key={w} type="button" className={`fs-opt ${csCompulsoryWeapon === w ? "active" : ""}`} onClick={() => setCsCompulsoryWeapon(w)}>
                  {w === "NONE" ? "None" : w}
                </button>
              ))}
            </div>
          </OptSection>

          <OptSection label="Compulsory Armour">
            <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {CS_ARMOURS.map((a) => (
                <button key={a.val} type="button" className={`fs-opt ${csCompulsoryArmour === a.val ? "active" : ""}`} onClick={() => setCsCompulsoryArmour(a.val)}>
                  {a.label}
                </button>
              ))}
            </div>
          </OptSection>
        </>
      ) : gameMode === "LW" ? (
        <>
          <OptSection label="Team Mode">
            <div className="fs-opt-grid">
              {LW_TEAM_MODES.map((m) => (
                <button key={m} type="button" className={`fs-opt ${lwTeamMode === m ? "active" : ""}`} onClick={() => setLwTeamMode(m)}>{m}</button>
              ))}
            </div>
          </OptSection>
          <p className="text-[11px] text-white/60">Lone Wolf matches are 1v1 or 2v2 solo-style matches with headshot rules enabled.</p>
        </>
      ) : (
        <>
          <OptSection label="Map">
            <div className="fs-opt-grid">
              {BR_MAPS.map((m) => (
                <button key={m} type="button" className={`fs-opt ${brMap === m ? "active" : ""}`} onClick={() => setBrMap(m)}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </OptSection>

          <OptSection label="Team Mode">
            <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {BR_TEAM_MODES.map((m) => (
                <button key={m} type="button" className={`fs-opt ${brTeamMode === m ? "active" : ""}`} onClick={() => setBrTeamMode(m)}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </OptSection>

          <OptSection label="Win Condition">
            <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {BR_WIN_CONDITIONS.map((w) => (
                <button key={w.val} type="button" className={`fs-opt ${brWinCondition === w.val ? "active" : ""}`} onClick={() => setBrWinCondition(w.val)}>
                  {w.label}
                </button>
              ))}
            </div>
            {brWinCondition === "FIRST_TO_N_KILLS" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--fs-text-3)' }}>Target:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={brTargetKills}
                  onChange={(e) => setBrTargetKills(Number(e.target.value))}
                  className="fs-input"
                  style={{ width: '80px', height: '36px' }}
                />
                <span className="text-xs" style={{ color: 'var(--fs-text-3)' }}>kills</span>
              </div>
            )}
          </OptSection>

          <OptSection label="Banned Guns (multi-select)">
            <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {BR_BANNED_OPTS.map((g) => {
                const active = brBannedGuns.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`fs-opt ${active ? "active" : ""}`}
                    onClick={() =>
                      setBrBannedGuns((arr) =>
                        active ? arr.filter((x) => x !== g) : [...arr, g],
                      )
                    }
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </OptSection>
        </>
      )}

      {/* Eligibility (collapsible) */}
      <div className="fs-card fs-card-body">
        <button
          onClick={() => setShowElig(!showElig)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="fs-label" style={{ marginBottom: 0 }}>Eligibility</span>
          {showElig ? <ChevronUp size={14} style={{ color: 'var(--fs-text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--fs-text-3)' }} />}
        </button>
        {showElig && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--fs-text-3)' }}>Min Level</p>
              <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                {[0, 20, 30, 40, 50, 60].map((v) => (
                  <button key={v} type="button" className={`fs-opt ${minLevel === v ? "active" : ""}`} onClick={() => setMinLevel(v)}>
                    {v === 0 ? "Any" : v}
                  </button>
                ))}
              </div>
            </div>
            <YesNo label="No Emulator" value={noEmulator} onChange={setNoEmulator} />
          </div>
        )}
      </div>

      {/* Anti-cheat (collapsible) */}
      <div className="fs-card fs-card-body">
        <button
          onClick={() => setShowAntiCheat(!showAntiCheat)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="fs-label" style={{ marginBottom: 0 }}>Anti-cheat</span>
          {showAntiCheat ? <ChevronUp size={14} style={{ color: 'var(--fs-text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--fs-text-3)' }} />}
        </button>
        {showAntiCheat && (
          <div className="mt-3 space-y-3">
            <YesNo label="POV Required" value={povRequired} onChange={setPovRequired} />
            <YesNo label="Screenshot Required" value={screenshotRequired} onChange={setScreenshotRequired} />
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--fs-text-3)' }}>Report Window</p>
              <div className="fs-opt-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {[30, 60, 120].map((v) => (
                  <button key={v} type="button" className={`fs-opt ${reportWindowMins === v ? "active" : ""}`} onClick={() => setReportWindowMins(v)}>
                    {v === 60 ? "1 hour" : v === 120 ? "2 hours" : `${v} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Private toggle */}
      <div className="fs-card fs-card-body">
        <label className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--fs-text-2)' }}>Private (invite only)</span>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-5 w-5"
            style={{ accentColor: 'var(--fs-gold)' }}
          />
        </label>
      </div>

      {/* Title */}
      <div className="fs-card fs-card-body">
        <label className="fs-label">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${igName}'s ${gameMode} Match`}
          className="fs-input"
        />
      </div>

      {/* Bottom */}
      <div className="text-center text-xs" style={{ color: 'var(--fs-text-3)' }}>
        Make sure you have entered correct information
      </div>
      <p className="text-center text-xs" style={{ color: 'var(--fs-amber)' }}>
        Rs {entryFee} will be deducted from your wallet
      </p>

      <button
        onClick={submit}
        disabled={submitting}
        className="fs-btn fs-btn-primary fs-btn-full fixed bottom-0 left-0 right-0 z-40"
        style={{
          borderRadius: '14px 14px 0 0',
          height: '56px',
          fontSize: '15px',
          paddingBottom: 'calc(8px + var(--fs-safe-bottom))',
        }}
      >
        <ButtonLoading loading={submitting} loadingText="Creating contest...">
          CREATE CONTEST
        </ButtonLoading>
      </button>
    </div>
  );
}

function StepDot({ active }: { active: boolean }) {
  return (
    <div
      className="h-3 w-3 rounded-full"
      style={{ background: active ? 'var(--fs-red)' : 'var(--fs-surface-3)' }}
    />
  );
}

function OptSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fs-card fs-card-body">
      <label className="fs-label">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function YesNo({
  label, value, onChange, reversed = false,
}: { label: string; value: boolean; onChange: (v: boolean) => void; reversed?: boolean }) {
  return (
    <div className="fs-card fs-card-body">
      <label className="fs-label">{label}</label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {reversed ? (
          <>
            <button type="button" className={`fs-opt ${!value ? "active" : ""}`} onClick={() => onChange(false)}>No</button>
            <button type="button" className={`fs-opt ${value ? "active" : ""}`} onClick={() => onChange(true)}>Yes</button>
          </>
        ) : (
          <>
            <button type="button" className={`fs-opt ${value ? "active" : ""}`} onClick={() => onChange(true)}>Yes</button>
            <button type="button" className={`fs-opt ${!value ? "active" : ""}`} onClick={() => onChange(false)}>No</button>
          </>
        )}
      </div>
    </div>
  );
}
