const Module = require('module');
const path = require('path');

let server;

const dbPackagePath = path.join(__dirname, '../../../packages/db/dist/index.js');
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@fireslot/db') {
    return originalLoad(dbPackagePath, parent, isMain);
  }

  return originalLoad(request, parent, isMain);
};

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
