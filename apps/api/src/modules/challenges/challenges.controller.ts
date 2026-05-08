import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ChallengGameMode, ChallengeStatus, DisputeReason } from "@fireslot/db";
import { ChallengesService, CreateChallengeDto } from "./challenges.service";
import { JwtAuthGuard } from "../../common/guards/jwt.guard";
import {
  PermissionsGuard,
  RequirePermission,
} from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("challenges")
export class ChallengesController {
  constructor(private readonly svc: ChallengesService) {}

  @Get()
  list(
    @Query("gameMode") gameMode?: ChallengGameMode,
    @Query("status") status?: ChallengeStatus,
    @Query("limit") limit?: string,
  ) {
    return this.svc.list({
      gameMode,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("invite/:code")
  byInvite(@Param("code") code: string) {
    return this.svc.getByInviteCode(code);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my")
  mine(@CurrentUser() u: any) {
    return this.svc.myChallenges(u.sub);
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() u: any, @Body() dto: CreateChallengeDto) {
    return this.svc.createChallenge(u.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/join")
  join(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() body: { inviteCode?: string },
  ) {
    return this.svc.joinChallenge(u.sub, id, body?.inviteCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/room")
  room(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() body: { roomId: string; password: string },
  ) {
    return this.svc.shareRoom(id, u.sub, u.role, body.roomId, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/result")
  result(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body()
    body: {
      kills?: number;
      headshots?: number;
      damage?: number;
      survivalTimeSecs?: number;
      gotBooyah?: boolean;
      screenshotUrl?: string;
      povUrl?: string;
    },
  ) {
    return this.svc.submitResult(id, u.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/dispute")
  dispute(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body()
    body: { reason: DisputeReason; description: string; evidenceUrls: string[] },
  ) {
    return this.svc.raiseDispute(
      id,
      u.sub,
      body.reason,
      body.description,
      body.evidenceUrls ?? [],
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  cancel(@CurrentUser() u: any, @Param("id") id: string) {
    return this.svc.cancelChallenge(id, u.sub);
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/challenges")
export class AdminChallengesController {
  constructor(private readonly svc: ChallengesService) {}

  @RequirePermission("tournaments", "read")
  @Get()
  list(
    @Query("status") status?: ChallengeStatus,
    @Query("gameMode") gameMode?: ChallengGameMode,
    @Query("limit") limit?: string,
  ) {
    return this.svc.listAdmin({
      status,
      gameMode,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @RequirePermission("tournaments", "read")
  @Get("disputes")
  disputes() {
    return this.svc.listDisputes();
  }

  @RequirePermission("tournaments", "read")
  @Get("stats")
  stats() {
    return this.svc.getStats();
  }

  @RequirePermission("tournaments", "write")
  @Post(":id/room")
  shareRoom(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() body: { roomId: string; password: string },
  ) {
    return this.svc.shareRoom(id, u.sub, "ADMIN", body.roomId, body.password);
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/disputes")
export class AdminDisputesController {
  constructor(private readonly svc: ChallengesService) {}

  @RequirePermission("tournaments", "approve")
  @Put(":id/resolve")
  resolve(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body()
    body: { resolution: "CREATOR" | "OPPONENT" | "REFUND"; note?: string },
  ) {
    return this.svc.resolveDispute(id, u.sub, body.resolution, body.note);
  }
}
