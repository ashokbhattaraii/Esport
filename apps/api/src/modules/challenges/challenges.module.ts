import { Module } from "@nestjs/common";
import {
  AdminChallengesController,
  AdminDisputesController,
  ChallengesController,
} from "./challenges.controller";
import { ChallengesService } from "./challenges.service";
import { AdminModule } from "../admin/admin.module";
import { ProfileModule } from "../profile/profile.module";

@Module({
  imports: [AdminModule, ProfileModule],
  controllers: [
    ChallengesController,
    AdminChallengesController,
    AdminDisputesController,
  ],
  providers: [ChallengesService],
})
export class ChallengesModule {}
