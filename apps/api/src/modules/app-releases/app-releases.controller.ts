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
import { diskStorage } from "multer";
import { extname } from "path";
import { JwtAuthGuard } from "../../common/guards/jwt.guard";
import { PermissionsGuard, RequirePermission } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AppReleasesService } from "./app-releases.service";

const releaseStorage = diskStorage({
  destination: process.env.APK_DIR ?? "./public/downloads",
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}${extname(file.originalname).toLowerCase().endsWith(".apk") ? "" : ".apk"}`);
  },
});

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
  constructor(private svc: AppReleasesService) {}

  @RequirePermission("config", "read")
  @Get()
  list() {
    return this.svc.list();
  }

  @RequirePermission("config", "write")
  @Post()
  @UseInterceptors(
    FileInterceptor("apk", {
      storage: releaseStorage,
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { version: string; releaseNotes?: string; isLatest?: string },
    @CurrentUser() u: any,
    @Req() req: any,
  ) {
    return this.svc.create(
      {
        version: body.version,
        releaseNotes: body.releaseNotes,
        filename: file?.filename ?? "",
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
