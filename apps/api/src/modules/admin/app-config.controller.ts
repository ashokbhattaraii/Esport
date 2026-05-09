import { Controller, Get, Inject, Param, Put, Post, Body, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppConfigService } from './app-config.service';
import { PRISMA } from '../../prisma/prisma.module';
import { PrismaClient } from '@fireslot/db';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { Role } from '@fireslot/db';
import { StorageService } from '../../common/storage/storage.service';

@Controller()
export class AppConfigController {
  constructor(
    private svc: AppConfigService,
    @Inject(PRISMA) private prisma: PrismaClient,
    private storage: StorageService,
  ) {}

  @Get('app/config')
  async publicConfig() {
    return this.svc.getPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/app-config')
  async adminGetAll() {
    return this.svc.getAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put('admin/app-config/:key')
  async set(@Param('key') key: string, @Body() body: { value: string }, @Req() req: any) {
    const adminId = req.user?.sub ?? 'system';
    return this.svc.set(key, body.value, adminId, req.ip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/app-config/upload-qr')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadQr(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { method: string },
    @Req() req: any,
  ) {
    if (!file) throw new Error('No file uploaded');
    const method = body.method || 'esewa';
    const result = await this.storage.upload(file, 'config', `qr-${method}`);
    const key = `deposit_qr_${method}`;
    const adminId = req.user?.sub ?? 'system';
    await this.svc.set(key, result.url, adminId, req.ip);
    return { key, url: result.url };
  }
}
