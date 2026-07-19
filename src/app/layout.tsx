import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Body / UI — a clean, quiet grotesque.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Display — Fraunces, a characterful "old-style" serif with soft
// optical warmth. Used with restraint for headlines only. This is the
// page's personality: editorial calm, like a studio's own stationery,
// not a SaaS dashboard.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TrustOS — For creative professionals',
  description: 'From first enquiry to final delivery. The calm way to run a creative business.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'text-sm',
            style: {
              background: '#1a2420',
              color: '#f4f1ea',
              borderRadius: '10px',
              fontSize: '13px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
