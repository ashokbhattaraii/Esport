import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt.guard";
import { PermissionsGuard, RequirePermission } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { StorageService } from "../../common/storage/storage.service";
import { AppReleasesService } from "./app-releases.service";

@Controller("app")
export class PublicAppReleasesController {
  constructor(private svc: AppReleasesService) {}

  @Get("latest-release")
  latest() {
    return this.svc.getLatest();
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/app-releases")
export class AppReleasesController {
  constructor(
    private svc: AppReleasesService,
    private storage: StorageService,
  ) {}

  @RequirePermission("config", "read")
  @Get()
  list() {
    return this.svc.list();
  }

  @RequirePermission("config", "write")
  @Post()
  @UseInterceptors(
    FileInterceptor("apk", {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { version: string; releaseNotes?: string; isLatest?: string },
    @CurrentUser() u: any,
    @Req() req: any,
  ) {
    const url = file ? (await this.storage.upload(file, "releases", body.version)).url : "";
    return this.svc.create(
      {
        version: body.version,
        releaseNotes: body.releaseNotes,
        filename: url,
        isLatest: body.isLatest !== "false",
      },
      u.sub,
      req.ip,
    );
  }

  @RequirePermission("config", "write")
  @Put(":id/latest")
  setLatest(
    @Param("id") id: string,
    @Body() body: { isLatest: boolean },
    @CurrentUser() u: any,
    @Req() req: any,
  ) {
    return this.svc.setLatest(id, !!body.isLatest, u.sub, req.ip);
  }
}
