const isStaticExport =
  process.env.CAPACITOR_BUILD === 'true' ||
  process.env.NEXT_PUBLIC_IS_NATIVE === 'true'

const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  assetPrefix: isStaticExport ? './' : '',
  // assetPrefix './' makes all asset paths relative -- required for file:// protocol
}
module.exports = nextConfig
