import type { Metadata } from 'next'
import { Hanken_Grotesk, Instrument_Serif } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'TrustOS — For creative professionals',
  description: 'From first enquiry to final delivery. The calm way to run a creative business.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${instrument.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'text-sm',
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-fg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  )
}
