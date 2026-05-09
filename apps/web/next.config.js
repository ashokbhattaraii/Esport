/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  // Only export static files when building for Capacitor shell
  ...(isCapacitorBuild ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: isCapacitorBuild,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [320, 480, 640, 750, 828, 1080],
  },
  // Never set assetPrefix here — it breaks Vercel deployments.
}

module.exports = nextConfig
