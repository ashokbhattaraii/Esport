import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@fireslot/db';
import { PRISMA } from '../../prisma/prisma.module';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private prisma: PrismaClient) {}

  list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, role: true, isBanned: true, createdAt: true, profile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  setBan(id: string, banned: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isBanned: banned } });
  }

  async savePushToken(userId: string, token: string, platform = 'android') {
    return this.prisma.userPushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }

  leaderboard() {
    return this.prisma.tournamentParticipant.groupBy({
      by: ['userId'],
      _sum: { prizeEarned: true },
      orderBy: { _sum: { prizeEarned: 'desc' } },
      take: 50,
    });
  }
}
