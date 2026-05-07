const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnv(path.resolve(__dirname, '../../.env'));
loadEnv(path.resolve(__dirname, '.env.local'));

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? '';

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fireslot/shared'],
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
  },
  // Static export only when building for the Capacitor APK; the regular web
  // build keeps Next.js dynamic features.
  ...(isCapacitorBuild
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        images: {
          remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
        },
      }),
};
module.exports = nextConfig;
