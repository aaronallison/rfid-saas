/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 14.2.0+, no need for experimental.appDir
  
  // Enable modern optimizations
  swcMinify: true,
  
  // Enable compression for better performance
  compress: true,
}

module.exports = nextConfig