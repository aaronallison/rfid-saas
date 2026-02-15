import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'RFID Field Capture + Sync SaaS',
    template: '%s | RFID SaaS'
  },
  description: 'Professional field data capture and synchronization platform with RFID technology',
  keywords: ['RFID', 'field capture', 'data sync', 'SaaS', 'inventory management'],
  authors: [{ name: 'RFID SaaS Team' }],
  openGraph: {
    title: 'RFID Field Capture + Sync SaaS',
    description: 'Professional field data capture and synchronization platform',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}