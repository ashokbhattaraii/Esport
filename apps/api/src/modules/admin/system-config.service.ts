import { BadRequestException, Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigCategory, ConfigType, PrismaClient, SystemConfig } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import { AdminActionLogService } from "./admin-action-log.service";

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private cache = new Map<string, SystemConfig>();

  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private logs: AdminActionLogService,
  ) {}

  async onModuleInit() {
    await this.refresh();
  }

  async refresh() {
    try {
      const all = await this.prisma.systemConfig.findMany();
      this.cache.clear();
      for (const c of all) this.cache.set(c.key, c);
    } catch (e: any) {
      // Tolerate boot before migrations are applied (P2021 = table missing).
      if (e?.code === "P2021") {
        console.warn(
          "[SystemConfig] Table missing — run `pnpm --filter @fireslot/db prisma migrate deploy` then `prisma db seed`.",
        );
        this.cache.clear();
        return;
      }
      throw e;
    }
  }

  private static FALLBACKS: Record<string, string> = {
    MAX_ENTRY_FEE: "50",
    SYSTEM_FEE_PERCENT: "25",
    MIN_SYSTEM_FEE: "5",
    FREE_DAILY_PRIZE_POOL: "100",
    FREE_DAILY_COOLDOWN_HOURS: "24",
    FREE_DAILY_MAX_PER_DAY: "1",
    KILL_RACE_ENABLED: "true",
    DEFAULT_PRIZE_SPLITS:
      '{"SOLO_TOP3":[50,30,20],"SQUAD_TOP10":[25,18,12,8,8,3,3,3,3,3]}',
    MAINTENANCE_MODE: "false",
    NEW_USER_BONUS_ENABLED: "false",
    NEW_USER_BONUS_AMOUNT: "50",
  };

  get(key: string): string {
    const c = this.cache.get(key);
    if (c) return c.value;
    const fb = SystemConfigService.FALLBACKS[key];
    if (fb !== undefined) return fb;
    throw new BadRequestException(`Unknown config key ${key}`);
  }

  getOr(key: string, fallback: string): string {
    return this.cache.get(key)?.value ?? fallback;
  }

  getNumber(key: string): number {
    const v = this.get(key);
    const n = Number(v);
    if (Number.isNaN(n)) throw new BadRequestException(`Config ${key} is not a number`);
    return n;
  }

  getBool(key: string): boolean {
    return this.get(key).toLowerCase() === "true";
  }

  getJson<T = any>(key: string): T {
    return JSON.parse(this.get(key)) as T;
  }

  async getAll(): Promise<SystemConfig[]> {
    return this.prisma.systemConfig.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] });
  }

  async getByCategory(category: ConfigCategory): Promise<SystemConfig[]> {
    return this.prisma.systemConfig.findMany({ where: { category }, orderBy: { label: "asc" } });
  }

  async set(key: string, value: string, adminId: string, ip?: string | null) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new BadRequestException(`Unknown config key ${key}`);
    this.validateValue(existing.type, value);

    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: { value, updatedBy: adminId },
    });
    this.cache.set(key, updated);
    await this.logs.log(adminId, "config.update", "config", key, { value: existing.value }, { value }, ip);
    return updated;
  }

  async bulkSet(updates: { key: string; value: string }[], adminId: string, ip?: string | null) {
    const results: SystemConfig[] = [];
    await this.prisma.$transaction(async (tx: any) => {
      for (const u of updates) {
        const existing = await tx.systemConfig.findUnique({ where: { key: u.key } });
        if (!existing) throw new BadRequestException(`Unknown config key ${u.key}`);
        this.validateValue(existing.type, u.value);
        const updated = await tx.systemConfig.update({
          where: { key: u.key },
          data: { value: u.value, updatedBy: adminId },
        });
        results.push(updated);
      }
    });
    for (const r of results) this.cache.set(r.key, r);
    await this.logs.log(adminId, "config.bulk_update", "config", null, null, { updates }, ip);
    return results;
  }

  private validateValue(type: ConfigType, value: string) {
    switch (type) {
      case "NUMBER":
        if (Number.isNaN(Number(value))) throw new BadRequestException("Value must be a number");
        break;
      case "BOOLEAN":
        if (!["true", "false"].includes(value.toLowerCase()))
          throw new BadRequestException("Value must be true/false");
        break;
      case "JSON":
        try { JSON.parse(value); } catch { throw new BadRequestException("Value must be valid JSON"); }
        break;
    }
  }
}
