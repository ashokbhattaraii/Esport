import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt.guard";
import {
  PermissionsGuard,
  RequirePermission,
} from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ReferralsService } from "./referrals.service";
import { SystemConfigService } from "../admin/system-config.service";

@UseGuards(JwtAuthGuard)
@Controller("referrals")
export class ReferralsController {
  constructor(private referrals: ReferralsService) {}

  @Get("me")
  mine(@CurrentUser() u: any) {
    return this.referrals.myReferral(u.sub);
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/referrals")
export class AdminReferralsController {
  constructor(
    private referrals: ReferralsService,
    private config: SystemConfigService,
  ) {}

  @RequirePermission("referrals", "read")
  @Get()
  summary() {
    return this.referrals.adminSummary();
  }

  @RequirePermission("referrals", "write")
  @Put("settings")
  async settings(
    @Body()
    body: {
      enabled: boolean;
      signupRewardNpr: number;
      referrerDepositRewardNpr: number;
    },
    @CurrentUser() u: any,
    @Req() req: any,
  ) {
    const updates = [
      { key: "REFERRAL_ENABLED", value: String(Boolean(body.enabled)) },
      { key: "REFERRAL_SIGNUP_REWARD_NPR", value: String(Number(body.signupRewardNpr ?? 0)) },
      {
        key: "REFERRAL_FIRST_DEPOSIT_REWARD_NPR",
        value: String(Number(body.referrerDepositRewardNpr ?? 0)),
      },
    ];
    await this.config.bulkSet(updates, u.sub, req.ip);
    return this.referrals.adminSummary();
  }
}
