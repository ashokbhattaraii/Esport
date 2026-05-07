import { INestApplication, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://esport-web-rho.vercel.app',
];

function getCorsOrigins() {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured?.length ? configured : defaultCorsOrigins;
}

export function configureApp(
  app: INestApplication,
  options: { createStaticDirs?: boolean } = {},
) {
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  if (options.createStaticDirs && !existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(join(process.cwd(), uploadDir)));

  const apkDir = process.env.APK_DIR ?? './public/downloads';
  if (options.createStaticDirs && !existsSync(apkDir)) {
    mkdirSync(apkDir, { recursive: true });
  }
  app.use('/downloads', express.static(join(process.cwd(), apkDir)));
}
