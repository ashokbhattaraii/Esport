import { Module } from "@nestjs/common";
import { TournamentsController } from "./tournaments.controller";
import { TournamentsService } from "./tournaments.service";
import { PrizeService } from "./prize.service";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [AdminModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, PrizeService],
  exports: [PrizeService],
})
export class TournamentsModule {}
