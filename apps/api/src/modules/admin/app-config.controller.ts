import { Controller, Get, Inject, Param, Put, Body, UseGuards, Req } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { PRISMA } from '../../prisma/prisma.module';
import { PrismaClient } from '@fireslot/db';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { Role } from '@fireslot/db';

@Controller()
export class AppConfigController {
  constructor(private svc: AppConfigService, @Inject(PRISMA) private prisma: PrismaClient) {}

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
}
