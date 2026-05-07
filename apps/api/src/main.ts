import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(join(process.cwd(), uploadDir)));

  const apkDir = process.env.APK_DIR ?? './public/downloads';
  if (!existsSync(apkDir)) mkdirSync(apkDir, { recursive: true });
  app.use('/downloads', express.static(join(process.cwd(), apkDir)));

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`API ready on http://localhost:${port}/api`);
}
bootstrap();
