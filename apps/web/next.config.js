/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated experimental.appDir - App Router is stable in Next.js 14
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Add performance and security optimizations
  poweredByHeader: false,
  compress: true,
  // Enable experimental features that are beneficial
  experimental: {
    // Enable TypeScript plugin for better IDE experience
    typedRoutes: true,
  },
}

module.exports = nextConfig