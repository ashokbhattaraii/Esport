"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast, handleJoinError } from "@/lib/toast";
import { ButtonLoading, PageHeader } from "@/components/ui";

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
  const modeTitle = gameMode === "CS" ? "Clash Squad" : gameMode === "LW" ? "Lone Wolf" : "Battle Royale";
  const modeDescription =
    gameMode === "CS"
      ? "Fast, team-based fights with tighter round control."
      : gameMode === "LW"
        ? "Small-format duels with the cleanest ruleset."
        : "Classic survival format with map and win-condition control.";
  const totalPlayers = gameMode === "CS" ? csPlayerCount : 2;

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
    <div className="mx-auto max-w-6xl px-4 py-6 pb-32">
      <PageHeader
        eyebrow="Challenges"
        title="Create Challenge"
        description="Build a room with the same visual language used across the rest of the app, then publish it in one pass."
        action={
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">{modeTitle}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">Rs {entryFee} entry</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">{isPrivate ? "Private" : "Public"}</span>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Current mode" value={modeTitle} helper={modeDescription} />
        <MetricCard label="Entry fee" value={`Rs ${entryFee}`} helper="Live payout preview updates instantly." />
        <MetricCard
          label="Winner preview"
          value={`Rs ${prizeToWinner}`}
          helper={gameMode === "CS" ? `${csPlayerCount} players in the current bracket.` : `Estimated for a ${gameMode === "LW" ? "duel" : "solo"} room.`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,380px)]">
        <div className="space-y-5">
          <SectionCard
            title="Match blueprint"
            description="Set the room title, wallet cost, and visibility before configuring the ruleset."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label mb-2 block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${igName}'s ${modeTitle} room`}
                  className="input"
                />
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <label className="label mb-2 block">Entry fee</label>
                <input
                  type="range"
                  min={20}
                  max={50}
                  step={5}
                  value={entryFee}
                  onChange={(e) => setEntryFee(Number(e.target.value))}
                  className="w-full accent-[#E53935]"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                  <span>Rs {entryFee}</span>
                  <span className="text-[#FFD166]">Winner preview Rs {prizeToWinner}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <label className="label mb-2 block">Visibility</label>
                <button
                  type="button"
                  onClick={() => setIsPrivate((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    isPrivate
                      ? "border-[#E53935]/50 bg-[#E53935]/10 text-white"
                      : "border-white/10 bg-black/20 text-white/70"
                  }`}
                >
                  <span>{isPrivate ? "Private invite-only room" : "Public room"}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {isPrivate ? "Locked" : "Open"}
                  </span>
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Game mode"
            description="Pick the rule set first. The rest of the form adapts to the selected format."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <ModeCard
                active={gameMode === "BR"}
                title="Battle Royale"
                subtitle="Map, team mode, and win condition controls"
                onClick={() => setGameMode("BR")}
              />
              <ModeCard
                active={gameMode === "CS"}
                title="Clash Squad"
                subtitle="Round-based, weapon-limited team room"
                onClick={() => setGameMode("CS")}
              />
              <ModeCard
                active={gameMode === "LW"}
                title="Lone Wolf"
                subtitle="Fast duels with minimal setup"
                onClick={() => setGameMode("LW")}
              />
            </div>
          </SectionCard>

          {gameMode === "CS" ? (
            <SectionCard title="Clash Squad rules" description="Tuned for round-based team fights.">
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceGroup label="Team Mode">
                  {CS_TEAM_MODES.map((m) => (
                    <ChoiceButton key={m} active={csTeamMode === m} onClick={() => setCsTeamMode(m)}>
                      {m}
                    </ChoiceButton>
                  ))}
                </ChoiceGroup>

                <ChoiceGroup label="Rounds">
                  {([7, 13] as const).map((rounds) => (
                    <ChoiceButton key={rounds} active={csRounds === rounds} onClick={() => setCsRounds(rounds)}>
                      {rounds}
                    </ChoiceButton>
                  ))}
                </ChoiceGroup>

                <ChoiceGroup label="Coins">
                  {(["DEFAULT", "9980"] as const).map((coin) => (
                    <ChoiceButton key={coin} active={csCoins === coin} onClick={() => setCsCoins(coin)}>
                      {coin === "DEFAULT" ? "Default" : coin}
                    </ChoiceButton>
                  ))}
                </ChoiceGroup>

                <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
                  <ToggleCard label="Throwable limit" value={csThrowable} onChange={setCsThrowable} />
                  <ToggleCard label="Character skill" value={characterSkill} onChange={setCharacterSkill} />
                  <ToggleCard label="Gun attribute" value={gunAttribute} onChange={setGunAttribute} />
                  <ToggleCard label="Headshot only" value={headshotOnly} onChange={setHeadshotOnly} reversed />
                  <ToggleCard label="Loadout lock" value={csLoadout} onChange={setCsLoadout} />
                </div>

                <ChoiceGroup label="Compulsory Weapon" className="md:col-span-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {CS_WEAPONS.map((w) => (
                      <ChoiceButton key={w} active={csCompulsoryWeapon === w} onClick={() => setCsCompulsoryWeapon(w)}>
                        {w === "NONE" ? "None" : w}
                      </ChoiceButton>
                    ))}
                  </div>
                </ChoiceGroup>

                <ChoiceGroup label="Compulsory Armour" className="md:col-span-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {CS_ARMOURS.map((a) => (
                      <ChoiceButton key={a.val} active={csCompulsoryArmour === a.val} onClick={() => setCsCompulsoryArmour(a.val)}>
                        {a.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </ChoiceGroup>
              </div>
            </SectionCard>
          ) : gameMode === "LW" ? (
            <SectionCard title="Lone Wolf rules" description="Keep it simple for duels or small pair matches.">
              <ChoiceGroup label="Team Mode">
                <div className="grid gap-2 sm:grid-cols-2">
                  {LW_TEAM_MODES.map((m) => (
                    <ChoiceButton key={m} active={lwTeamMode === m} onClick={() => setLwTeamMode(m)}>
                      {m}
                    </ChoiceButton>
                  ))}
                </div>
              </ChoiceGroup>
              <p className="mt-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/65">
                Lone Wolf rooms are tuned for direct head-to-head play. Keep the rest of the rules minimal so players can join quickly.
              </p>
            </SectionCard>
          ) : (
            <SectionCard title="Battle Royale rules" description="Pick the map and end condition for the room.">
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceGroup label="Map">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BR_MAPS.map((m) => (
                      <ChoiceButton key={m} active={brMap === m} onClick={() => setBrMap(m)}>
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </ChoiceButton>
                    ))}
                  </div>
                </ChoiceGroup>

                <ChoiceGroup label="Team Mode">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {BR_TEAM_MODES.map((m) => (
                      <ChoiceButton key={m} active={brTeamMode === m} onClick={() => setBrTeamMode(m)}>
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </ChoiceButton>
                    ))}
                  </div>
                </ChoiceGroup>

                <ChoiceGroup label="Win Condition" className="md:col-span-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {BR_WIN_CONDITIONS.map((w) => (
                      <ChoiceButton key={w.val} active={brWinCondition === w.val} onClick={() => setBrWinCondition(w.val)}>
                        {w.label}
                      </ChoiceButton>
                    ))}
                  </div>
                  {brWinCondition === "FIRST_TO_N_KILLS" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-white/45">Target kills</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={brTargetKills}
                        onChange={(e) => setBrTargetKills(Number(e.target.value))}
                        className="input !w-24"
                      />
                    </div>
                  )}
                </ChoiceGroup>

                <ChoiceGroup label="Banned Guns" className="md:col-span-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {BR_BANNED_OPTS.map((g) => {
                      const active = brBannedGuns.includes(g);
                      return (
                        <ChoiceButton
                          key={g}
                          active={active}
                          onClick={() =>
                            setBrBannedGuns((arr) =>
                              active ? arr.filter((x) => x !== g) : [...arr, g],
                            )
                          }
                        >
                          {g}
                        </ChoiceButton>
                      );
                    })}
                  </div>
                </ChoiceGroup>
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Eligibility"
            description="Control who can enter. These limits show up before players join."
          >
            <div className="space-y-4">
              <ChoiceGroup label="Min level">
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {[0, 20, 30, 40, 50, 60].map((v) => (
                    <ChoiceButton key={v} active={minLevel === v} onClick={() => setMinLevel(v)}>
                      {v === 0 ? "Any" : v}
                    </ChoiceButton>
                  ))}
                </div>
              </ChoiceGroup>
              <ToggleCard label="No emulator" value={noEmulator} onChange={setNoEmulator} />
            </div>
          </SectionCard>

          <SectionCard
            title="Anti-cheat"
            description="Add proof requirements before results can be resolved."
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleCard label="POV required" value={povRequired} onChange={setPovRequired} />
                <ToggleCard label="Screenshot required" value={screenshotRequired} onChange={setScreenshotRequired} />
              </div>
              <ChoiceGroup label="Report window">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[30, 60, 120].map((v) => (
                    <ChoiceButton key={v} active={reportWindowMins === v} onClick={() => setReportWindowMins(v)}>
                      {v === 60 ? "1 hour" : v === 120 ? "2 hours" : `${v} min`}
                    </ChoiceButton>
                  ))}
                </div>
              </ChoiceGroup>
            </div>
          </SectionCard>
        </div>

        <aside className="h-fit lg:sticky lg:top-6">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,14,41,0.98),rgba(12,9,24,0.98))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">Live summary</p>
                <h2 className="mt-1 font-display text-2xl text-white">{title || `${igName}'s ${modeTitle}`}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                Draft
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <PreviewRow label="Mode" value={modeTitle} />
              <PreviewRow label="Entry fee" value={`Rs ${entryFee}`} />
              <PreviewRow label="Winner preview" value={`Rs ${prizeToWinner}`} accent />
              <PreviewRow label="Visibility" value={isPrivate ? "Private" : "Public"} />
              <PreviewRow label="Players" value={`${totalPlayers}`} />
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="label mb-2">Applied rules</p>
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{gameMode}</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{isPrivate ? "Invite only" : "Open room"}</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">Min lvl {minLevel || "Any"}</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">{noEmulator ? "No emulator" : "Emulator allowed"}</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-white/55">
              Double-check the mode and eligibility before publishing. Once this room is created, players will use the persisted rules immediately.
            </p>

            <button onClick={submit} disabled={submitting} className="btn-primary mt-5 w-full">
              <ButtonLoading loading={submitting} loadingText="Creating contest...">
                CREATE CONTEST
              </ButtonLoading>
            </button>

            <p className="mt-3 text-center text-xs text-white/45">
              Rs {entryFee} will be deducted from your wallet when the challenge is published.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[#111126] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
      <div className="mb-4">
        <p className="label">{title}</p>
        {description && <p className="mt-1 text-sm text-white/55">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111126] p-4">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-white/50">{helper}</p>}
    </div>
  );
}

function ChoiceGroup({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
        active
          ? "border-[#E53935]/60 bg-[#E53935]/12 text-white shadow-[0_0_0_1px_rgba(229,57,53,0.2)]"
          : "border-white/8 bg-white/5 text-white/72 hover:border-white/15 hover:bg-white/8"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleCard({
  label,
  value,
  onChange,
  reversed = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  reversed?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="label mb-0">{label}</span>
        <span className={`text-xs ${value ? "text-neon-green" : "text-white/45"}`}>
          {value ? "Enabled" : "Disabled"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {reversed ? (
          <>
            <ChoiceButton active={!value} onClick={() => onChange(false)}>No</ChoiceButton>
            <ChoiceButton active={value} onClick={() => onChange(true)}>Yes</ChoiceButton>
          </>
        ) : (
          <>
            <ChoiceButton active={value} onClick={() => onChange(true)}>Yes</ChoiceButton>
            <ChoiceButton active={!value} onClick={() => onChange(false)}>No</ChoiceButton>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-white/45">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-[#FFD166]" : "text-white"}`}>{value}</span>
    </div>
  );
}
