import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, { createStaticDirs: true });
  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`API ready on http://localhost:${port}/api`);
}
bootstrap();
