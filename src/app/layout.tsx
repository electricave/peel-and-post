import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Peel & Post Studio — Client Portal',
  description: 'Your sticker order portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#4A3728',
              color: '#F7F3EE',
              fontFamily: 'Lato, sans-serif',
              fontWeight: 700,
              borderRadius: '12px',
              padding: '14px 20px',
            },
          }}
        />
      </body>
    </html>
  )
}
