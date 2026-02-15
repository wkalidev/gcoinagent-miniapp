/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Autorise eval pour dev
    esmExternals: 'loose'
  },
  // Désactive CSP strict en dev
  poweredByHeader: false,
}

module.exports = nextConfig;
