/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 13.4+, no need for experimental flag
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable optimizations for production
  swcMinify: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Enable compression
  compress: true,
  // Optimize output for better performance
  output: 'standalone',
}

module.exports = nextConfig