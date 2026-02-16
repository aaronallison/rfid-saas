import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'RFID Field Capture',
    template: '%s | RFID Field Capture'
  },
  description: 'Complete RFID field capture and synchronization platform for efficient data collection and management.',
  keywords: ['RFID', 'field capture', 'data collection', 'synchronization', 'inventory management'],
  authors: [{ name: 'RFID Field Capture Team' }],
  creator: 'RFID Field Capture',
  publisher: 'RFID Field Capture',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rfid-field-capture.com',
    title: 'RFID Field Capture - Sync Your Data Seamlessly',
    description: 'Complete RFID field capture and synchronization platform for efficient data collection and management.',
    siteName: 'RFID Field Capture',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RFID Field Capture - Sync Your Data Seamlessly',
    description: 'Complete RFID field capture and synchronization platform for efficient data collection and management.',
    creator: '@rfidcapture',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body 
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider
            defaultTheme="system"
            storageKey="rfid-capture-theme"
          >
            <div id="root" className="min-h-screen">
              {children}
            </div>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}