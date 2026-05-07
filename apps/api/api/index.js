const Module = require('module');
const fs = require('fs');
const path = require('path');

const dbPackagePath = path.join(__dirname, '../../../packages/db/dist/index.js');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@fireslot/db') return originalLoad(dbPackagePath, parent, isMain);
  return originalLoad(request, parent, isMain);
};

let serverPromise;

const downloadDirs = [
  path.join(__dirname, '../public/downloads'),
  path.join(process.cwd(), 'public/downloads'),
  path.join(__dirname, '../../../public/downloads'),
];

function serveDownload(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/downloads/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  let filename;
  try {
    filename = decodeURIComponent(url.pathname.slice('/downloads/'.length));
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Invalid download path' }));
    return true;
  }

  if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Invalid download path' }));
    return true;
  }

  const filePath = downloadDirs
    .map((dir) => path.join(dir, filename))
    .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());

  if (!filePath) return false;

  const stat = fs.statSync(filePath);
  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Content-Type',
    filename.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'application/octet-stream',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }

  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function warmPrisma(app) {
  try {
    const prisma = app.get('PRISMA_CLIENT', { strict: false });
    await prisma?.$connect?.();
  } catch (err) {
    console.warn('Prisma preconnect skipped:', err?.message ?? err);
  }
}

async function getServer() {
  if (serverPromise) return serverPromise;
  serverPromise = (async () => {
    const { createApp } = require('../dist/main');
    const app = await createApp();
    await app.init();
    await warmPrisma(app);
    return app.getHttpAdapter().getInstance();
  })();
  return serverPromise;
}

module.exports = async function handler(req, res) {
  try {
    if (serveDownload(req, res)) return;

    const server = await getServer();
    return server(req, res);
  } catch (err) {
    console.error('API bootstrap failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'API bootstrap failed', error: String(err?.message ?? err) }));
  }
};
