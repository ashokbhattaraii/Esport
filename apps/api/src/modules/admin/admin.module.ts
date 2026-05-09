import {
  Controller,
  Get,
  Inject,
  Module,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt.guard";
import { Roles, RolesGuard } from "../../common/guards/roles.guard";
import { PrismaClient, Role } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(@Inject(PRISMA) private prisma: PrismaClient) {}

  @Get("stats")
  async stats() {
    const [
      users,
      admins,
      bannedUsers,
      tournaments,
      liveTournaments,
      upcomingTournaments,
      completed,
      pendingPayments,
      pendingWithdrawals,
      pendingResults,
      approvedPayments,
      walletBalance,
      recentPayments,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: "ADMIN" } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.tournament.count(),
      this.prisma.tournament.count({ where: { status: "LIVE" } }),
      this.prisma.tournament.count({ where: { status: "UPCOMING" } }),
      this.prisma.tournament.count({ where: { status: "COMPLETED" } }),
      this.prisma.payment.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      this.prisma.matchResult.count({ where: { verified: false } }),
      this.prisma.payment.aggregate({
        where: { status: "APPROVED" },
        _sum: { amountNpr: true },
      }),
      this.prisma.wallet.aggregate({ _sum: { balanceNpr: true } }),
      this.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
              profile: true,
            },
          },
          tournament: true,
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          createdAt: true,
          profile: true,
        },
      }),
    ]);
    return {
      users,
      admins,
      bannedUsers,
      tournaments,
      liveTournaments,
      upcomingTournaments,
      completed,
      pendingPayments,
      pendingWithdrawals,
      pendingResults,
      approvedRevenueNpr: approvedPayments._sum.amountNpr ?? 0,
      walletLiabilityNpr: walletBalance._sum.balanceNpr ?? 0,
      recentPayments,
      recentUsers,
    };
  }

  @Get("users")
  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        roleId: true,
        roleRef: { select: { id: true, name: true, isSystem: true } },
        isBanned: true,
        createdAt: true,
        profile: true,
        wallet: true,
        _count: { select: { permissionOverrides: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post("users/:id/ban")
  ban(@Param("id") id: string) {
    return this.prisma.user.update({ where: { id }, data: { isBanned: true } });
  }

  @Post("users/:id/unban")
  unban(@Param("id") id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isBanned: false },
    });
  }

}

import { SystemConfigService } from "./system-config.service";
import { SystemConfigController } from "./system-config.controller";
import { FreeDailyWindowService } from "./free-daily-window.service";
import { FreeDailyWindowAdminController } from "./free-daily-window.controller";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { AdminActionLogService } from "./admin-action-log.service";
import { AdminActionLogController } from "./admin-action-log.controller";
import { ApkTestService } from "./apk-test.service";
import { ApkTestController } from "./apk-test.controller";
import { AppConfigService } from "./app-config.service";
import { AppConfigController } from "./app-config.controller";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { StorageModule } from "../../common/storage/storage.module";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

@Module({
  imports: [StorageModule, MulterModule.register({ storage: memoryStorage() })],
  controllers: [
    AdminController,
    SystemConfigController,
    FreeDailyWindowAdminController,
    RolesController,
    AdminActionLogController,
    ApkTestController,
    AppConfigController,
  ],
  providers: [
    SystemConfigService,
    FreeDailyWindowService,
    RolesService,
    AdminActionLogService,
    ApkTestService,
    AppConfigService,
    PermissionsGuard,
  ],
  exports: [
    SystemConfigService,
    FreeDailyWindowService,
    RolesService,
    AdminActionLogService,
    AppConfigService,
    PermissionsGuard,
  ],
})
export class AdminModule {}
