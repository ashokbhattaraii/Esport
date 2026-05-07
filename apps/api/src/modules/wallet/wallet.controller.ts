import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService, WithdrawDto } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, WithdrawalStatus } from '@fireslot/db';

@Controller('wallet')
export class WalletController {
  constructor(private readonly svc: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  mine(@CurrentUser() u: any) {
    return this.svc.getMine(u.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  withdraw(@CurrentUser() u: any, @Body() dto: WithdrawDto) {
    return this.svc.withdraw(u.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  @Get('withdrawals')
  listWithdrawals(@Query('status') status?: WithdrawalStatus) {
    return this.svc.listWithdrawals(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  @Post('withdrawals/:id/review')
  review(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Body() body: { status: WithdrawalStatus; note?: string },
  ) {
    return this.svc.reviewWithdrawal(u.sub, id, body.status, body.note);
  }
}
