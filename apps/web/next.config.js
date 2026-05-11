/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    unoptimized: false,
    deviceSizes: [320, 375, 414, 480, 640, 750, 828, 1080],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "default-src 'self' https://esport-web-rho.vercel.app https://esport-api-rho.vercel.app; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://esport-api-rho.vercel.app https://accounts.google.com wss: capacitor:; frame-src https://accounts.google.com" },
      ],
    }]
  },
}

module.exports = nextConfig
