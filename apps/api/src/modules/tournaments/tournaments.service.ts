import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  PrismaClient,
  TournamentStatus,
  GameMode,
  Role,
  TournamentType,
} from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import {
  CreateTournamentDto,
  PublishRoomDto,
  UpdateTournamentStatusDto,
} from "./dto";
import { PrizeService } from "./prize.service";
import { SystemConfigService } from "../admin/system-config.service";
import { FreeDailyWindowService } from "../admin/free-daily-window.service";
import { MemoryCacheService } from "../../common/cache/memory-cache.service";
import { RealtimeService } from "../../common/realtime/realtime.service";
import { createHash } from "crypto";
import {
  TOURNAMENT_LIST_CACHE_PREFIX,
  invalidateTournamentCaches,
  tournamentDetailCacheKey,
} from "./tournament-cache.keys";

const ROOM_CACHE_TTL_SECONDS = 30;
const TOURNAMENT_LIST_SOFT_TTL_SECONDS = 15;
const TOURNAMENT_LIST_HARD_TTL_SECONDS = 180;
const TOURNAMENT_DETAIL_SOFT_TTL_SECONDS = 10;
const TOURNAMENT_DETAIL_HARD_TTL_SECONDS = 120;
const roomCacheKey = (id: string) => `room:${id}`;

const TOURNAMENT_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  mode: true,
  map: true,
  type: true,
  entryFeeNpr: true,
  registrationFeeNpr: true,
  prizePoolNpr: true,
  perKillPrizeNpr: true,
  firstPrize: true,
  secondPrize: true,
  thirdPrize: true,
  fourthToTenthPrize: true,
  maxSlots: true,
  filledSlots: true,
  dateTime: true,
  status: true,
  killPrize: true,
  prizeStructure: true,
  perKillReward: true,
  booyahPrize: true,
  actualPlayers: true,
  roomLocked: true,
  roomLockedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TOURNAMENT_DETAIL_SELECT = {
  ...TOURNAMENT_LIST_SELECT,
  roomId: true,
  roomPassword: true,
  systemFeePercent: true,
  minLevel: true,
  maxHeadshotRate: true,
  allowEmulator: true,
  bannedGuns: true,
  characterSkillOn: true,
  gunAttributesOn: true,
  matchRules: true,
  booyahPrizeNote: true,
  rules: true,
  isAdminCreated: true,
  createdById: true,
  participants: {
    select: {
      id: true,
      userId: true,
      paid: true,
      joinedAt: true,
      placement: true,
      prizeEarned: true,
    },
  },
} as const;

export interface RoomDetails {
  tournamentId: string;
  roomId: string | null;
  roomPassword: string | null;
  status: TournamentStatus;
  updatedAt: Date;
  etag: string;
}

@Injectable()
export class TournamentsService implements OnModuleInit {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private prizes: PrizeService,
    private config: SystemConfigService,
    private freeDailyWindows: FreeDailyWindowService,
    private cache: MemoryCacheService,
    private realtime: RealtimeService,
  ) {}

  onModuleInit() {
    if (process.env.WARM_READ_CACHES !== "true") return;
    void this.warmReadCaches().catch((e) =>
      this.logger.warn(`Read cache warmup skipped: ${e.message}`),
    );
  }

  private buildEtag(t: { roomId: string | null; roomPassword: string | null; status: string; updatedAt: Date }) {
    return createHash("sha1")
      .update(`${t.roomId ?? ""}|${t.roomPassword ?? ""}|${t.status}|${t.updatedAt.getTime()}`)
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Cache-aside read for room details. Designed for the spike when
   * 200-500 players refresh the moment admin publishes the room.
   * Caller is expected to pass in userId/role; this enforces eligibility.
   */
  async getRoomDetails(
    tournamentId: string,
    userId?: string,
    role?: Role,
  ): Promise<RoomDetails> {
    let cached = this.cache.get<RoomDetails>(roomCacheKey(tournamentId));
    if (!cached) {
      const t = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, roomId: true, roomPassword: true, status: true, updatedAt: true },
      });
      if (!t) throw new NotFoundException("Tournament not found");
      const fresh: RoomDetails = {
        tournamentId: t.id,
        roomId: t.roomId,
        roomPassword: t.roomPassword,
        status: t.status,
        updatedAt: t.updatedAt,
        etag: this.buildEtag(t),
      };
      this.cache.set(roomCacheKey(tournamentId), fresh, ROOM_CACHE_TTL_SECONDS);
      cached = fresh;
    }

    let canSeeRoom = role === "ADMIN";
    if (!canSeeRoom && userId) {
      const p = await this.prisma.tournamentParticipant.findFirst({
        where: { tournamentId, userId, paid: true },
        select: { id: true },
      });
      canSeeRoom = !!p;
    }
    if (!canSeeRoom) {
      return { ...cached, roomId: null, roomPassword: null };
    }
    return cached;
  }

  invalidateRoomCache(tournamentId: string) {
    this.cache.del(roomCacheKey(tournamentId));
  }

  invalidateReadCaches(tournamentId?: string | null) {
    invalidateTournamentCaches(this.cache, tournamentId);
    if (tournamentId) this.invalidateRoomCache(tournamentId);
  }

  list(filters: {
    mode?: GameMode;
    status?: TournamentStatus;
    type?: TournamentType;
    minFee?: number;
    maxFee?: number;
    limit?: number;
  }) {
    const key = this.listCacheKey(filters);
    return this.cache.getStaleWhileRevalidate(
      key,
      TOURNAMENT_LIST_SOFT_TTL_SECONDS,
      TOURNAMENT_LIST_HARD_TTL_SECONDS,
      () => this.loadTournamentList(filters),
    );
  }

  private loadTournamentList(filters: {
    mode?: GameMode;
    status?: TournamentStatus;
    type?: TournamentType;
    minFee?: number;
    maxFee?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.mode) where.mode = filters.mode;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.minFee !== undefined || filters.maxFee !== undefined) {
      where.entryFeeNpr = {};
      if (filters.minFee !== undefined) where.entryFeeNpr.gte = filters.minFee;
      if (filters.maxFee !== undefined) where.entryFeeNpr.lte = filters.maxFee;
    }
    return this.prisma.tournament.findMany({
      where,
      select: TOURNAMENT_LIST_SELECT,
      orderBy: { dateTime: "asc" },
      take: this.normalizeListLimit(filters.limit),
    });
  }

  async getOne(id: string, userId?: string, role?: Role) {
    const t = await this.cache.getStaleWhileRevalidate(
      tournamentDetailCacheKey(id),
      TOURNAMENT_DETAIL_SOFT_TTL_SECONDS,
      TOURNAMENT_DETAIL_HARD_TTL_SECONDS,
      () => this.loadTournamentDetail(id),
    );
    if (!t) throw new NotFoundException();

    let canSeeRoom = role === "ADMIN";
    if (!canSeeRoom && userId) {
      const p = t.participants.find((x) => x.userId === userId);
      canSeeRoom = !!(p && p.paid);
    }
    if (!canSeeRoom) {
      return { ...t, roomId: null, roomPassword: null };
    }
    return t;
  }

  private loadTournamentDetail(id: string) {
    return this.prisma.tournament.findUnique({
      where: { id },
      select: TOURNAMENT_DETAIL_SELECT,
    });
  }

  async create(adminId: string, dto: CreateTournamentDto) {
    this.validateFeePlan(dto);
    const type = (dto.type ?? "SOLO_1ST") as TournamentType;
    const freePool = this.config.getNumber("FREE_DAILY_PRIZE_POOL");
    const entryFee = type === "FREE_DAILY" ? 0 : dto.entryFeeNpr;
    const prizePool = type === "FREE_DAILY" ? freePool : dto.prizePoolNpr;
    const minLevel = (dto as any).minLevel ?? this.config.getNumber("MIN_LEVEL_REQUIRED");
    const maxHeadshotRate =
      (dto as any).maxHeadshotRate ?? this.config.getNumber("HEADSHOT_RATE_LIMIT");
    const allowEmulator = !!(dto as any).allowEmulator;
    const bannedGuns: string[] = (dto as any).bannedGuns ?? [];
    const characterSkillOn = (dto as any).characterSkillOn ?? true;
    const gunAttributesOn = (dto as any).gunAttributesOn ?? false;

    // Preview with full lobby (Nepali Adda model — actual values recomputed at room lock).
    const preview = this.prizes.calculatePrizeStructure(
      { entryFeeNpr: entryFee, maxSlots: dto.maxSlots, type },
      dto.maxSlots,
    );

    const matchRules = this.buildMatchRules({
      entryFee,
      perKillReward: preview.perKillReward,
      booyahPrize: preview.booyahPrize,
      minLevel,
      maxHeadshotRate,
      allowEmulator,
      characterSkillOn,
      gunAttributesOn,
      bannedGuns,
    });

    const created = await this.prisma.tournament.create({
      data: {
        title: dto.title,
        description: dto.description,
        mode: dto.mode,
        map: dto.map,
        type,
        entryFeeNpr: entryFee,
        registrationFeeNpr: dto.registrationFeeNpr ?? 10,
        prizePoolNpr: prizePool,
        perKillPrizeNpr: preview.perKillReward,
        killPrize: preview.perKillReward,
        perKillReward: preview.perKillReward,
        booyahPrize: preview.booyahPrize,
        booyahPrizeNote: preview.booyahNote,
        prizeStructure: preview as any,
        matchRules: matchRules as any,
        minLevel,
        maxHeadshotRate,
        allowEmulator,
        bannedGuns,
        characterSkillOn,
        gunAttributesOn,
        firstPrize: preview.booyahPrize,
        secondPrize: 0,
        thirdPrize: 0,
        fourthToTenthPrize: 0,
        maxSlots: dto.maxSlots,
        dateTime: new Date(dto.dateTime),
        rules: dto.rules,
        roomId: dto.roomId,
        roomPassword: dto.roomPassword,
        isAdminCreated: true,
        createdById: adminId,
      },
    });
    this.invalidateReadCaches(created.id);
    return created;
  }

  previewPricing(entryFee: number, maxPlayers: number) {
    return this.prizes.calculatePrizeStructure(
      { entryFeeNpr: entryFee, maxSlots: maxPlayers },
      maxPlayers,
    );
  }

  async lockRoom(tournamentId: string) {
    const updated = await this.prizes.lockRoomAndFinalizePrizes(tournamentId);
    this.invalidateReadCaches(tournamentId);
    return updated;
  }

  private buildMatchRules(input: {
    entryFee: number;
    perKillReward: number;
    booyahPrize: number;
    minLevel: number;
    maxHeadshotRate: number;
    allowEmulator: boolean;
    characterSkillOn: boolean;
    gunAttributesOn: boolean;
    bannedGuns: string[];
  }) {
    return {
      entryFee: input.entryFee,
      perKillReward: input.perKillReward,
      booyahPrize: input.booyahPrize,
      booyahNote: "Scales with actual players (Rs 1 per player)",
      eligibility: {
        minLevel: input.minLevel,
        maxHeadshotRate: input.maxHeadshotRate,
        noEmulator: !input.allowEmulator,
      },
      strictlyProhibited: [
        "Hacks, panels, mods, or any game-modifying tools",
        "Glitches, bugs, or unfair gameplay",
        "Teaming up with opponents",
        "Abusive language toward players or host",
      ],
      violation: "No reward + Instant ban",
      roomSettings: {
        characterSkill: input.characterSkillOn,
        gunAttributes: input.gunAttributesOn,
        bannedGuns: input.bannedGuns,
      },
      importantInstructions: [
        "Enter only your Free Fire in-game name (no UID / no symbols)",
        "Room ID & Password shared 5 minutes before match",
        "Late join = No refund",
        "Unregistered players not allowed (inviting them leads to ban)",
        "Screen recording (POV) is mandatory if asked",
      ],
      importantNotes: [
        "Blacklisted IDs need POV / real screen recording to get reward",
        "If slots are not full, prize may change",
        "If room is full, record proof required for refund",
        "If killed by hacker or team-up player, record evidence for refund",
        "Raise issues with Customer Support within 1 hour after match",
      ],
      disclaimer:
        "FireSlot Nepal reserves the right to change rules, prizes, or take action anytime",
    };
  }

  async setStatus(id: string, dto: UpdateTournamentStatusDto) {
    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: dto.status },
    });
    this.invalidateReadCaches(id);
    this.realtime.emitToTournament(id, "tournament_status_changed", { status: dto.status });
    return updated;
  }

  async publishRoom(id: string, dto: PublishRoomDto) {
    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        roomId: dto.roomId,
        roomPassword: dto.roomPassword,
        status: TournamentStatus.LIVE,
      },
    });
    this.invalidateReadCaches(id);
    // Don't leak credentials over realtime — clients pull fresh via API after this nudge.
    this.realtime.emitToTournament(id, "room_details_published", { tournamentId: id });
    return updated;
  }

  async checkEligibility(userId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const checks: { passed: boolean; reason?: string; message?: string } = { passed: true };

    if (user.isBanned) {
      checks.passed = false;
      checks.reason = "ACCOUNT_BANNED";
      checks.message = "Your account is banned.";
    } else if (user.profile?.isBlacklisted) {
      checks.passed = false;
      checks.reason = "BLACKLISTED";
      checks.message =
        user.profile?.blacklistReason ?? "Your account is blacklisted from tournaments.";
    } else if (!user.profile) {
      checks.passed = false;
      checks.reason = "PROFILE_INCOMPLETE";
      checks.message = "Complete your Free Fire profile to join tournaments.";
    } else if (user.profile.level < t.minLevel) {
      checks.passed = false;
      checks.reason = "LEVEL_TOO_LOW";
      checks.message = `LEVEL_TOO_LOW: Need Level ${t.minLevel}, you are Level ${user.profile.level}`;
    } else if (
      user.profile.headshotRate != null &&
      user.profile.headshotRate > t.maxHeadshotRate
    ) {
      checks.passed = false;
      checks.reason = "HEADSHOT_RATE_TOO_HIGH";
      checks.message = `HEADSHOT_RATE_TOO_HIGH: Max ${t.maxHeadshotRate}%, yours is ${user.profile.headshotRate}%`;
    } else if (!t.allowEmulator && user.profile.isEmulator) {
      checks.passed = false;
      checks.reason = "EMULATOR_NOT_ALLOWED";
      checks.message = "Emulator / PC players are not allowed in this tournament.";
    }

    await this.prisma.tournamentEligibilityCheck.upsert({
      where: { tournamentId_userId: { tournamentId, userId } },
      create: {
        tournamentId,
        userId,
        passed: checks.passed,
        failReason: checks.reason ?? null,
      },
      update: {
        passed: checks.passed,
        failReason: checks.reason ?? null,
        checkedAt: new Date(),
      },
    });

    return {
      eligible: checks.passed,
      failReason: checks.reason,
      failMessage: checks.message,
      requirements: {
        minLevel: t.minLevel,
        maxHeadshotRate: t.maxHeadshotRate,
        allowEmulator: t.allowEmulator,
      },
      profile: user.profile
        ? {
            level: user.profile.level,
            headshotRate: user.profile.headshotRate,
            isEmulator: user.profile.isEmulator,
          }
        : null,
    };
  }

  async join(userId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.status !== TournamentStatus.UPCOMING)
      throw new BadRequestException("Tournament not open");
    if (t.filledSlots >= t.maxSlots)
      throw new BadRequestException("Tournament is full");

    if (t.type !== "FREE_DAILY") {
      const elig = await this.checkEligibility(userId, tournamentId);
      if (!elig.eligible) {
        throw new ForbiddenException(elig.failMessage ?? "Not eligible");
      }
    }

    if (t.type === "FREE_DAILY") {
      const elig = await this.freeDailyWindows.isUserEligible(userId);
      if (!elig.eligible) {
        throw new BadRequestException(
          `Free daily slot unavailable. Next at ${elig.nextWindowAt}`,
        );
      }
    }

    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new ConflictException("Already joined");

    const participant = await this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        paid: t.type === "FREE_DAILY", // free entry is auto-paid
      },
    });

    if (t.type === "FREE_DAILY") {
      await this.prizes.recordFreeDailyUse(userId, tournamentId);
    }
    this.invalidateReadCaches(tournamentId);
    return participant;
  }

  async myTournaments(userId: string) {
    return this.prisma.tournamentParticipant.findMany({
      where: { userId },
      include: { tournament: true },
      orderBy: { joinedAt: "desc" },
    });
  }

  async checkFreeDailyEligibility(userId: string) {
    return this.freeDailyWindows.isUserEligible(userId);
  }

  async declareWinners(
    tournamentId: string,
    winners: {
      userId: string;
      placement?: number;
      kills?: number;
      gotBooyah?: boolean;
    }[],
  ) {
    const results = winners.map((w) => ({
      userId: w.userId,
      kills: w.kills ?? 0,
      gotBooyah: w.gotBooyah ?? w.placement === 1,
    }));
    const out = await this.prizes.distributePrizes(tournamentId, results);
    this.invalidateReadCaches(tournamentId);
    this.realtime.emitToTournament(tournamentId, "tournament_status_changed", { status: "COMPLETED" });
    for (const c of out.credits ?? []) {
      this.realtime.emitToUser(c.userId, "prize_credited", { amount: c.amount, note: c.note });
      this.realtime.emitToUser(c.userId, "wallet_updated", {});
    }
    return out;
  }

  private validateFeePlan(dto: CreateTournamentDto) {
    const type = (dto.type ?? "SOLO_1ST") as TournamentType;

    const maxFee = this.config.getNumber("MAX_ENTRY_FEE");
    const freePool = this.config.getNumber("FREE_DAILY_PRIZE_POOL");

    if (type === "FREE_DAILY") {
      if (dto.prizePoolNpr !== freePool) {
        throw new BadRequestException(
          `FREE_DAILY tournaments must have prize pool NPR ${freePool}`,
        );
      }
      return;
    }

    if (dto.entryFeeNpr > maxFee) {
      throw new BadRequestException(`Entry fee cannot exceed NPR ${maxFee}`);
    }
    if (dto.entryFeeNpr < 10) {
      throw new BadRequestException("Entry fee must be at least NPR 10");
    }
    if ((dto.registrationFeeNpr ?? 10) > dto.entryFeeNpr) {
      throw new BadRequestException(
        "Registration fee must be included inside the player fee",
      );
    }
  }

  private validatePrizeStructure(percents: number[], type: TournamentType) {
    if (type === "KILL_RACE") return; // no placement payouts
    const sum = percents.reduce((a, b) => a + b, 0);
    if (Math.round(sum) !== 100) {
      throw new BadRequestException(
        `Prize structure percentages must sum to 100 (got ${sum})`,
      );
    }
  }

  private listCacheKey(filters: {
    mode?: GameMode;
    status?: TournamentStatus;
    type?: TournamentType;
    minFee?: number;
    maxFee?: number;
    limit?: number;
  }) {
    return `${TOURNAMENT_LIST_CACHE_PREFIX}${JSON.stringify({
      mode: filters.mode ?? null,
      status: filters.status ?? null,
      type: filters.type ?? null,
      minFee: filters.minFee ?? null,
      maxFee: filters.maxFee ?? null,
      limit: this.normalizeListLimit(filters.limit),
    })}`;
  }

  private normalizeListLimit(limit?: number) {
    if (!Number.isFinite(limit)) return 100;
    return Math.min(Math.max(Math.trunc(limit!), 1), 200);
  }

  private async warmReadCaches() {
    await Promise.allSettled([
      this.list({}),
      this.list({ status: TournamentStatus.UPCOMING }),
      this.list({ status: TournamentStatus.LIVE }),
    ]);
  }
}
