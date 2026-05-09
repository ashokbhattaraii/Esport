/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  // Only export static files when building for Capacitor.
  // For normal web runtime, keep Next defaults to avoid path/chunk mismatches.
  ...(isCapacitorBuild
    ? {
        output: 'export',
        trailingSlash: true,
        assetPrefix:
          process.env.NEXT_PUBLIC_APP_URL || 'https://fireslot.vercel.app',
      }
    : {}),
  images: { unoptimized: true },
}

module.exports = nextConfig
