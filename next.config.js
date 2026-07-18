/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  },
  images: {
    unoptimized: true,
    domains: ['localhost']
  },
}

module.exports = nextConfig
