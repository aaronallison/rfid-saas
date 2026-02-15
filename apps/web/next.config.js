/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'RFID Field Capture + Sync SaaS',
  },
}

module.exports = nextConfig