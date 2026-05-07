import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaClient } from '@fireslot/db';
import { PRISMA } from '../../prisma/prisma.module';

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    @Inject(PRISMA) private prisma: PrismaClient,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('users/push-token')
  pushToken(
    @CurrentUser() u: any,
    @Body() body: { token: string; platform?: string },
  ) {
    return this.users.savePushToken(u.sub, body.token, body.platform ?? 'android');
  }

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async leaderboard() {
    const rows = await this.users.leaderboard();
    const ids = rows.map((r: any) => r.userId);
    const profiles = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: { profile: true },
    });
    return rows.map((r: any) => {
      const u = profiles.find((p: any) => p.id === r.userId);
      return {
        userId: r.userId,
        ign: u?.profile?.ign ?? u?.email,
        prizeEarned: r._sum.prizeEarned ?? 0,
      };
    });
  }
}
