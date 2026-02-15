import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RFID Field Capture - Sync Your Data Seamlessly',
  description: 'Complete RFID field capture and synchronization platform for efficient data collection and management.',
  keywords: ['RFID', 'field capture', 'data synchronization', 'data collection', 'inventory management'],
  authors: [{ name: 'RFID Capture Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}