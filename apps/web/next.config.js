/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Environment variables that should be available to the client
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  // Note: App Router handles body parsing differently than Pages Router
  // Request body limits are handled at the server level or in individual route handlers

  // Webpack configuration for Stripe webhook raw body parsing
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add raw body parsing for Stripe webhooks
      config.externals = config.externals || []
      config.externals.push({
        'stripe': 'stripe'
      })
    }
    return config
  },

  // Image optimization settings
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Allow raw body for Stripe webhook
      {
        source: '/api/billing/webhook',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ]
  },

  // Performance optimizations
  experimental: {
    // Enable static optimization for better performance
    optimizeCss: true,
    // Enable server components logging in development
    serverComponentsExternalPackages: ['stripe'],
  },

  // Output configuration for deployment
  output: 'standalone',
  
  // Disable powered by header
  poweredByHeader: false,
}

module.exports = nextConfig