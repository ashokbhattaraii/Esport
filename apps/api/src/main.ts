import 'reflect-metadata';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';

export async function createApp(opts: { createStaticDirs?: boolean } = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins?.length
      ? (origin, cb) => {
          if (!origin) return cb(null, true);
          const normalized = origin.replace(/\/+$/, '');
          cb(null, corsOrigins.includes('*') || corsOrigins.includes(normalized));
        }
      : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  if (opts.createStaticDirs) {
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    app.use('/uploads', express.static(join(process.cwd(), uploadDir)));

    const apkDir = process.env.APK_DIR ?? './public/downloads';
    if (!existsSync(apkDir)) mkdirSync(apkDir, { recursive: true });
    app.use('/downloads', express.static(join(process.cwd(), apkDir)));
  }

  return app;
}

if (require.main === module) {
  (async () => {
    const app = await createApp({ createStaticDirs: true });
    const port = parseInt(process.env.PORT ?? '4000', 10);
    await app.listen(port, '0.0.0.0');
    console.log(`API ready on port ${port}`);
  })();
}
