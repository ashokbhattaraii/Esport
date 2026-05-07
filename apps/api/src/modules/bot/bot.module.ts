import { Module } from "@nestjs/common";
import { BotController } from "./bot.controller";
import { BotJobService } from "./bot-job.service";
import { BotSchedulerService } from "./bot-scheduler.service";
import { BotAccuracyService } from "./bot-accuracy.service";
import { BotRollbackService } from "./bot-rollback.service";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [AdminModule],
  controllers: [BotController],
  providers: [BotJobService, BotSchedulerService, BotAccuracyService, BotRollbackService],
  exports: [BotJobService, BotAccuracyService, BotRollbackService],
})
export class BotModule {}
