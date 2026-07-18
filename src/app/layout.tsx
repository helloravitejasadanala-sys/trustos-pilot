import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TrustOS — For creative professionals',
  description: 'From first enquiry to final delivery. The calm way to run a creative business.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            className: 'text-sm',
            style: {
              background: '#171717',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
