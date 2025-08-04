import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import NavigationBar from '@/components/navigation-bar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gordos Tracker',
  description: 'Aplicación para rastrear partidas y estadísticas de League of Legends del grupo Gordos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <NavigationBar />
        {children}
      </body>
    </html>
  )
}
