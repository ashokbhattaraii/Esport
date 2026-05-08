"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Coins, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast, handleJoinError } from "@/lib/toast";
import { ButtonLoading } from "@/components/ui";

type GameMode = "BR" | "CS";

const CS_TEAM_MODES = ["1v1", "2v2", "3v3", "4v4"];
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

  // CS state
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

  // BR state
  const [brMap, setBrMap] = useState("BERMUDA");
  const [brTeamMode, setBrTeamMode] = useState("SOLO");
  const [brWinCondition, setBrWinCondition] = useState("KILLS");
  const [brTargetKills, setBrTargetKills] = useState(5);
  const [brBannedGuns, setBrBannedGuns] = useState<string[]>([]);

  // Eligibility / anti-cheat
  const [showElig, setShowElig] = useState(false);
  const [showAntiCheat, setShowAntiCheat] = useState(false);
  const [minLevel, setMinLevel] = useState(0);
  const [noEmulator, setNoEmulator] = useState(true);
  const [povRequired, setPovRequired] = useState(true);
  const [screenshotRequired, setScreenshotRequired] = useState(true);
  const [reportWindowMins, setReportWindowMins] = useState(60);

  const [submitting, setSubmitting] = useState(false);

  const prizeToWinner = useMemo(
    () => Math.floor(entryFee * 2 * 0.8),
    [entryFee],
  );

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
    <div className="space-y-4 pb-32 -mx-4 px-4 bg-[#1a0a3c] text-white min-h-screen">
      {/* Top: in-game name */}
      <div className="rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 p-3 flex items-center gap-2 shadow-lg">
        <Gamepad2 size={18} />
        <span className="font-display text-sm">{igName}</span>
      </div>

      {/* Entry fee */}
      <Card>
        <Label icon={<Coins size={14} />}>Entry Fee</Label>
        <input
          type="range"
          min={10}
          max={50}
          step={5}
          value={entryFee}
          onChange={(e) => setEntryFee(Number(e.target.value))}
          className="w-full accent-yellow-400"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-white/70">
          <span>Rs {entryFee}</span>
          <span>Winner gets <b className="text-yellow-300">Rs {prizeToWinner}</b></span>
        </div>
      </Card>

      {/* Game mode tabs */}
      <Card>
        <Label>Game Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <ModeTab active={gameMode === "BR"} onClick={() => setGameMode("BR")}>Battle Royale</ModeTab>
          <ModeTab active={gameMode === "CS"} onClick={() => setGameMode("CS")}>Clash Squad</ModeTab>
        </div>
      </Card>

      {gameMode === "CS" ? (
        <>
          <Card>
            <Label>Team Mode</Label>
            <Grid cols={4}>
              {CS_TEAM_MODES.map((m) => (
                <Pill key={m} active={csTeamMode === m} onClick={() => setCsTeamMode(m)}>{m}</Pill>
              ))}
            </Grid>
          </Card>

          <YesNo label="Throwable Limit" value={csThrowable} onChange={setCsThrowable} />
          <YesNo label="Character Skill" value={characterSkill} onChange={setCharacterSkill} />
          <YesNo label="Gun Attribute" value={gunAttribute} onChange={setGunAttribute} />
          <YesNo label="Headshot Only" value={headshotOnly} onChange={setHeadshotOnly} reversed />

          <Card>
            <Label>Rounds</Label>
            <Grid cols={2}>
              <Pill active={csRounds === 7} onClick={() => setCsRounds(7)}>7</Pill>
              <Pill active={csRounds === 13} onClick={() => setCsRounds(13)}>13</Pill>
            </Grid>
          </Card>

          <Card>
            <Label>Coins</Label>
            <Grid cols={2}>
              <Pill active={csCoins === "DEFAULT"} onClick={() => setCsCoins("DEFAULT")}>Default</Pill>
              <Pill active={csCoins === "9980"} onClick={() => setCsCoins("9980")}>9980</Pill>
            </Grid>
          </Card>

          <YesNo label="Loadout" value={csLoadout} onChange={setCsLoadout} />

          <Card>
            <Label>Compulsory Weapon</Label>
            <Grid cols={4}>
              {CS_WEAPONS.map((w) => (
                <Pill
                  key={w}
                  active={csCompulsoryWeapon === w}
                  onClick={() => setCsCompulsoryWeapon(w)}
                >
                  {w === "NONE" ? "None" : w}
                </Pill>
              ))}
            </Grid>
          </Card>

          <Card>
            <Label>Compulsory Armour</Label>
            <Grid cols={3}>
              {CS_ARMOURS.map((a) => (
                <Pill
                  key={a.val}
                  active={csCompulsoryArmour === a.val}
                  onClick={() => setCsCompulsoryArmour(a.val)}
                >
                  {a.label}
                </Pill>
              ))}
            </Grid>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Label>Map</Label>
            <Grid cols={4}>
              {BR_MAPS.map((m) => (
                <Pill key={m} active={brMap === m} onClick={() => setBrMap(m)}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </Pill>
              ))}
            </Grid>
          </Card>

          <Card>
            <Label>Team Mode</Label>
            <Grid cols={3}>
              {BR_TEAM_MODES.map((m) => (
                <Pill key={m} active={brTeamMode === m} onClick={() => setBrTeamMode(m)}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </Pill>
              ))}
            </Grid>
          </Card>

          <Card>
            <Label>Win Condition</Label>
            <Grid cols={2}>
              {BR_WIN_CONDITIONS.map((w) => (
                <Pill key={w.val} active={brWinCondition === w.val} onClick={() => setBrWinCondition(w.val)}>
                  {w.label}
                </Pill>
              ))}
            </Grid>
            {brWinCondition === "FIRST_TO_N_KILLS" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-white/70">Target:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={brTargetKills}
                  onChange={(e) => setBrTargetKills(Number(e.target.value))}
                  className="w-20 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-white text-xs"
                />
                <span className="text-xs text-white/50">kills</span>
              </div>
            )}
          </Card>

          <Card>
            <Label>Banned Guns (multi-select)</Label>
            <Grid cols={2}>
              {BR_BANNED_OPTS.map((g) => {
                const active = brBannedGuns.includes(g);
                return (
                  <Pill
                    key={g}
                    active={active}
                    onClick={() =>
                      setBrBannedGuns((arr) =>
                        active ? arr.filter((x) => x !== g) : [...arr, g],
                      )
                    }
                  >
                    {g}
                  </Pill>
                );
              })}
            </Grid>
          </Card>
        </>
      )}

      {/* Eligibility (collapsible) */}
      <Card>
        <button
          onClick={() => setShowElig(!showElig)}
          className="flex w-full items-center justify-between text-left"
        >
          <Label>Eligibility</Label>
          {showElig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showElig && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-white/70 mb-1">Min Level</p>
              <Grid cols={6}>
                {[0, 20, 30, 40, 50, 60].map((v) => (
                  <Pill key={v} active={minLevel === v} onClick={() => setMinLevel(v)}>
                    {v === 0 ? "Any" : v}
                  </Pill>
                ))}
              </Grid>
            </div>
            <YesNo label="No Emulator" value={noEmulator} onChange={setNoEmulator} />
          </div>
        )}
      </Card>

      {/* Anti-cheat (collapsible) */}
      <Card>
        <button
          onClick={() => setShowAntiCheat(!showAntiCheat)}
          className="flex w-full items-center justify-between text-left"
        >
          <Label>Anti-cheat</Label>
          {showAntiCheat ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showAntiCheat && (
          <div className="mt-3 space-y-3">
            <YesNo label="POV Required" value={povRequired} onChange={setPovRequired} />
            <YesNo label="Screenshot Required" value={screenshotRequired} onChange={setScreenshotRequired} />
            <div>
              <p className="text-xs text-white/70 mb-1">Report Window</p>
              <Grid cols={3}>
                {[30, 60, 120].map((v) => (
                  <Pill key={v} active={reportWindowMins === v} onClick={() => setReportWindowMins(v)}>
                    {v === 60 ? "1 hour" : v === 120 ? "2 hours" : `${v} min`}
                  </Pill>
                ))}
              </Grid>
            </div>
          </div>
        )}
      </Card>

      {/* Private toggle */}
      <Card>
        <label className="flex items-center justify-between text-sm">
          <span className="text-white/80">Private (invite only)</span>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 accent-yellow-400"
          />
        </label>
      </Card>

      {/* Title */}
      <Card>
        <Label>Title (optional)</Label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${igName}'s ${gameMode} Match`}
          className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
      </Card>

      {/* Bottom warning + create button */}
      <div className="text-center text-xs text-white/60">
        Make sure you have entered correct information
      </div>
      <p className="text-center text-xs text-yellow-300">
        Rs {entryFee} will be deducted from your wallet
      </p>

      <button
        onClick={submit}
        disabled={submitting}
        className="fixed bottom-0 left-0 right-0 z-40 mx-auto block w-full max-w-md rounded-t-lg bg-[#E53935] py-4 font-display text-base font-bold text-white shadow-2xl disabled:opacity-50"
      >
        <ButtonLoading loading={submitting} loadingText="Creating contest...">
          CREATE CONTEST
        </ButtonLoading>
      </button>
    </div>
  );
}

// ----------- UI primitives -----------
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f0628] p-3">{children}</div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1 text-sm font-bold text-white">
      {icon} {children}
    </p>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

function Pill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
        active
          ? "border-yellow-400 text-yellow-300 bg-yellow-400/10"
          : "border-white/20 text-white/70 bg-black/30"
      }`}
    >
      {children}
    </button>
  );
}

function ModeTab({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-3 font-display text-sm transition ${
        active
          ? "bg-yellow-400 text-black"
          : "bg-black/30 text-white/70 border border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function YesNo({
  label, value, onChange, reversed = false,
}: { label: string; value: boolean; onChange: (v: boolean) => void; reversed?: boolean }) {
  return (
    <Card>
      <Label>{label}</Label>
      <Grid cols={2}>
        {reversed ? (
          <>
            <Pill active={!value} onClick={() => onChange(false)}>No</Pill>
            <Pill active={value} onClick={() => onChange(true)}>Yes</Pill>
          </>
        ) : (
          <>
            <Pill active={value} onClick={() => onChange(true)}>Yes</Pill>
            <Pill active={!value} onClick={() => onChange(false)}>No</Pill>
          </>
        )}
      </Grid>
    </Card>
  );
}
