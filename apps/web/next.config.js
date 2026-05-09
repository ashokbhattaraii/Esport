/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  // Only export static files when building for Capacitor
  ...(isCapacitorBuild ? {
    output: 'export',
    trailingSlash: true,
    assetPrefix: process.env.NEXT_PUBLIC_APP_URL || 'https://fireslot.vercel.app',
  } : {
    // Web builds: normal configuration, no static export or assetPrefix
    trailingSlash: true,
  }),
  images: { unoptimized: true },
}

module.exports = nextConfig
