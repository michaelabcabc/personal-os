/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pg-native'],
  },
}

module.exports = nextConfig
