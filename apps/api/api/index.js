let server;

async function getServer() {
  if (server) return server;

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module');
  const { configureApp } = require('../dist/bootstrap');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  configureApp(app);
  await app.init();

  server = app.getHttpAdapter().getInstance();
  return server;
}

module.exports = async function handler(req, res) {
  try {
    const app = await getServer();
    return app(req, res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'API bootstrap failed' }));
  }
};
