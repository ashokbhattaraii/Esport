import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

let server: any;

async function getServer() {
  if (server) return server;

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  configureApp(app);
  await app.init();

  server = app.getHttpAdapter().getInstance();
  return server;
}

export default async function handler(req: any, res: any) {
  const app = await getServer();
  return app(req, res);
}
