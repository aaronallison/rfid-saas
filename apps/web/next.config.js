/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if you plan to use App Router
    appDir: false,
  },
  // Security headers (additional to middleware)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
          }
        ],
      },
    ]
  },
  // Enable if you need to proxy RFID device requests
  async rewrites() {
    return [
      // Example: Proxy RFID device API calls
      // {
      //   source: '/rfid-api/:path*',
      //   destination: 'http://rfid-device-ip:port/:path*',
      // },
    ]
  },
}

module.exports = nextConfig