import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import { AdminActionLogService } from "../admin/admin-action-log.service";

@Injectable()
export class AppReleasesService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private logs: AdminActionLogService,
  ) {}

  async getLatest() {
    const r = await this.prisma.appRelease.findFirst({
      where: { isLatest: true },
      orderBy: { createdAt: "desc" },
    });
    if (!r) return null;
    return {
      version: r.version,
      releaseNotes: r.releaseNotes,
      downloadUrl: r.filename.startsWith("http") ? r.filename : `/downloads/${r.filename}`,
    };
  }

  async incrementDownload(id: string) {
    return this.prisma.appRelease
      .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
      .catch(() => null);
  }

  async list() {
    return this.prisma.appRelease.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(
    data: { version: string; releaseNotes?: string; filename: string; isLatest?: boolean },
    adminId: string,
    ip?: string | null,
  ) {
    if (!data.version || !data.filename)
      throw new BadRequestException("version and filename required");

    const isLatest = data.isLatest !== false;

    const created = await this.prisma.$transaction(async (tx: any) => {
      if (isLatest) {
        await tx.appRelease.updateMany({
          where: { isLatest: true },
          data: { isLatest: false },
        });
      }
      return tx.appRelease.create({
        data: {
          version: data.version,
          releaseNotes: data.releaseNotes,
          filename: data.filename,
          isLatest,
        },
      });
    });

    await this.logs.log(adminId, "app_release.create", "app_release", created.id, null, data, ip);
    return created;
  }

  async setLatest(id: string, isLatest: boolean, adminId: string, ip?: string | null) {
    const r = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.prisma.$transaction(async (tx: any) => {
      if (isLatest) {
        await tx.appRelease.updateMany({
          where: { isLatest: true },
          data: { isLatest: false },
        });
      }
      await tx.appRelease.update({ where: { id }, data: { isLatest } });
    });
    await this.logs.log(adminId, "app_release.set_latest", "app_release", id, { isLatest: r.isLatest }, { isLatest }, ip);
    return { ok: true };
  }
}
