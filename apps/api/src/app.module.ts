import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfileModule } from './modules/profile/profile.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ResultsModule } from './modules/results/results.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BotModule } from './modules/bot/bot.module';
import { SupportModule } from './modules/support/support.module';
import { AppReleasesModule } from './modules/app-releases/app-releases.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    TournamentsModule,
    ChallengesModule,
    PaymentsModule,
    WalletModule,
    ResultsModule,
    NotificationsModule,
    AdminModule,
    CategoriesModule,
    BotModule,
    SupportModule,
    AppReleasesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
