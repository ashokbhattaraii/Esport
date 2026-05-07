const Module = require('module');
const path = require('path');

const dbPackagePath = path.join(__dirname, '../../../packages/db/dist/index.js');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@fireslot/db') return originalLoad(dbPackagePath, parent, isMain);
  return originalLoad(request, parent, isMain);
};

let serverPromise;

async function getServer() {
  if (serverPromise) return serverPromise;
  serverPromise = (async () => {
    const { createApp } = require('../dist/main');
    const app = await createApp();
    await app.init();
    return app.getHttpAdapter().getInstance();
  })();
  return serverPromise;
}

module.exports = async function handler(req, res) {
  try {
    const server = await getServer();
    return server(req, res);
  } catch (err) {
    console.error('API bootstrap failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'API bootstrap failed', error: String(err?.message ?? err) }));
  }
};
