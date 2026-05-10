export const SYSTEM_FEE_PERCENT = 0.20;

export const GAME_MODE_LIMITS = {
  BR_SOLO: { teamSize: 1, maxTeams: 48, maxPlayers: 48 },
  BR_DUO: { teamSize: 2, maxTeams: 24, maxPlayers: 48 },
  BR_SQUAD: { teamSize: 4, maxTeams: 12, maxPlayers: 48 },
  CS_4V4: { teamSize: 4, maxTeams: 2, maxPlayers: 8 },
  LW_1V1: { teamSize: 1, maxTeams: 2, maxPlayers: 2 },
  LW_2V2: { teamSize: 2, maxTeams: 2, maxPlayers: 4 },
  CRAFTLAND: { teamSize: 1, maxTeams: 50, maxPlayers: 50 },
} as const;

export type PrizeGameMode = keyof typeof GAME_MODE_LIMITS;

export function getDefaultTournamentType(mode: string): string {
  if (mode.startsWith("CS_") || mode.startsWith("LW_")) return "SOLO_1ST";
  if (mode === "BR_SQUAD" || mode === "BR_DUO") return "SQUAD_TOP10";
  if (mode === "BR_SOLO") return "SOLO_TOP3";
  return "SOLO_1ST";
}

export function isWinnerTakesAllOnly(mode: string): boolean {
  return mode.startsWith("CS_") || mode.startsWith("LW_");
}

export interface PrizeResult {
  grossPool: number;
  platformFee: number;
  netPool: number;
  perKillReward: number;
  booyahPrize: number;
  prizeBreakdown: { rank: string; amount: number; percent: number }[];
  isEstimate: boolean;
  estimatedFor: number;
}

export function calculatePrize(params: {
  entryFee: number;
  playerCount: number;
  tournamentType: string;
  systemFeePercent?: number;
}): PrizeResult {
  const { entryFee, playerCount, tournamentType } = params;
  const feePercent = params.systemFeePercent ?? SYSTEM_FEE_PERCENT;

  if (playerCount === 0 || entryFee === 0) {
    return {
      grossPool: 0,
      platformFee: 0,
      netPool: 0,
      perKillReward: 0,
      booyahPrize: 0,
      prizeBreakdown: [],
      isEstimate: true,
      estimatedFor: 0,
    };
  }

  const grossPool = entryFee * playerCount;
  const platformFee = Math.floor(grossPool * feePercent);
  const netPool = grossPool - platformFee;

  const avgKills = playerCount <= 4 ? 1.5 : playerCount <= 12 ? 2.0 : 2.5;
  const killPool = Math.floor(netPool * 0.8);
  const perKillReward = Math.max(1, Math.floor(killPool / (playerCount * avgKills)));
  const booyahPrize = Math.max(1, playerCount);

  let prizeBreakdown: { rank: string; amount: number; percent: number }[] = [];

  const isWTA =
    tournamentType === "SOLO_1ST" || isWinnerTakesAllOnly(tournamentType);

  if (isWTA) {
    prizeBreakdown = [{ rank: "1st Place", amount: netPool, percent: 100 }];
  } else if (tournamentType === "SOLO_TOP3") {
    const splits = [0.5, 0.3, 0.2];
    prizeBreakdown = [
      { rank: "1st", amount: Math.floor(netPool * splits[0]), percent: 50 },
      { rank: "2nd", amount: Math.floor(netPool * splits[1]), percent: 30 },
      { rank: "3rd", amount: Math.floor(netPool * splits[2]), percent: 20 },
    ];
  } else if (tournamentType === "SQUAD_TOP10") {
    const splits = [0.25, 0.18, 0.12, 0.08, 0.08, 0.05, 0.05, 0.05, 0.05, 0.05];
    const pool90 = Math.floor(netPool * 0.9);
    prizeBreakdown = splits
      .map((s, i) => ({
        rank: `#${i + 1}`,
        amount: Math.floor(pool90 * s),
        percent: Math.round(s * 100),
      }))
      .filter((p) => p.amount > 0);
  } else if (tournamentType === "KILL_RACE") {
    prizeBreakdown = [{ rank: "Per Kill", amount: perKillReward, percent: 0 }];
  } else if (tournamentType === "COMBO") {
    const placementPool = Math.floor(netPool * 0.6);
    const killPoolCombo = Math.floor(netPool * 0.4);
    prizeBreakdown = [
      { rank: "1st Place", amount: Math.floor(placementPool * 0.5), percent: 30 },
      { rank: "2nd Place", amount: Math.floor(placementPool * 0.3), percent: 18 },
      { rank: "3rd Place", amount: Math.floor(placementPool * 0.2), percent: 12 },
      {
        rank: "Per Kill",
        amount: Math.floor(killPoolCombo / (playerCount * avgKills)),
        percent: 0,
      },
    ];
  }

  return {
    grossPool,
    platformFee,
    netPool,
    perKillReward,
    booyahPrize,
    prizeBreakdown,
    isEstimate: true,
    estimatedFor: playerCount,
  };
}

export function validateTournamentCreation(params: {
  gameMode: string;
  tournamentType: string;
  entryFee: number;
  maxPlayers: number;
}): { valid: boolean; error?: string } {
  const limits = GAME_MODE_LIMITS[params.gameMode as PrizeGameMode];
  if (!limits) return { valid: false, error: "Invalid game mode" };

  if (params.maxPlayers > limits.maxPlayers) {
    return {
      valid: false,
      error: `${params.gameMode} supports max ${limits.maxPlayers} players`,
    };
  }

  if (params.maxPlayers % limits.teamSize !== 0) {
    return {
      valid: false,
      error: `Player count must be divisible by team size (${limits.teamSize})`,
    };
  }

  if (params.entryFee < 0) return { valid: false, error: "Entry fee cannot be negative" };
  if (params.entryFee > 50) return { valid: false, error: "Entry fee cannot exceed Rs 50" };

  if (isWinnerTakesAllOnly(params.gameMode) && params.tournamentType !== "SOLO_1ST") {
    return {
      valid: false,
      error: "CS and Lone Wolf tournaments must be Winner Takes All",
    };
  }

  return { valid: true };
}

export function formatSlots(mode: string, filledSlots: number, maxPlayers: number): string {
  const limits = GAME_MODE_LIMITS[mode as PrizeGameMode];
  if (!limits || limits.teamSize === 1) return `${filledSlots}/${maxPlayers} players`;
  const filledTeams = Math.floor(filledSlots / limits.teamSize);
  const maxTeams = Math.floor(maxPlayers / limits.teamSize);
  return `${filledTeams}/${maxTeams} teams`;
}
