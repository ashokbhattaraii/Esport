const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  assetPrefix: process.env.NEXT_PUBLIC_IS_NATIVE === 'true' ? './' : '',
  // assetPrefix './' makes all asset paths relative -- required for file:// protocol
}
module.exports = nextConfig
