import type { Metadata } from 'next'
import { Bricolage_Grotesque, Manrope } from 'next/font/google'
import NavigationBar from '@/components/navigation-bar'
import './globals.css'

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
})

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
})

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
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased">
        <NavigationBar />
        {children}
      </body>
    </html>
  )
}
