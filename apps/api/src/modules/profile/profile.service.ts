import { Inject, Injectable } from '@nestjs/common';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { PrismaClient } from '@fireslot/db';
import { PRISMA } from '../../prisma/prisma.module';

export class UpsertProfileDto {
  @IsString() @MinLength(4) freeFireUid!: string;
  @IsString() @MinLength(2) ign!: string;
  @IsInt() @Min(1) @Max(100) level!: number;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) headshotRate?: number;
  @IsOptional() @IsBoolean() isEmulator?: boolean;
}

@Injectable()
export class ProfileService {
  constructor(@Inject(PRISMA) private prisma: PrismaClient) {}

  upsert(userId: string, dto: UpsertProfileDto) {
    return this.prisma.playerProfile.upsert({
      where: { userId },
      update: dto,
      create: { ...dto, userId },
    });
  }

  get(userId: string) {
    return this.prisma.playerProfile.findUnique({ where: { userId } });
  }
}
