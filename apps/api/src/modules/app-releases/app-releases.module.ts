import { Module } from "@nestjs/common";
import {
  AppReleasesController,
  PublicAppReleasesController,
} from "./app-releases.controller";
import { AppReleasesService } from "./app-releases.service";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [AdminModule],
  controllers: [AppReleasesController, PublicAppReleasesController],
  providers: [AppReleasesService],
})
export class AppReleasesModule {}
