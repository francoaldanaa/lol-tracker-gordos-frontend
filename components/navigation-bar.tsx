"use client"

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'

export default function NavigationBar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className="bg-gray-950 border-b border-gray-800 px-4 md:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => handleNavigation('/')}>
          <Image
            src="/assets/img/logo.png"
            alt="Gordos Tracker Logo"
            width={40}
            height={40}
            className="mr-3"
          />
          <span className="text-white text-xl font-bold">Gordos Tracker</span>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center space-x-6">
          <button
            className={`text-white transition-all duration-200 px-2 py-1 ${
              isActive('/') 
                ? 'font-bold underline underline-offset-4' 
                : 'hover:font-bold'
            }`}
            onClick={() => handleNavigation('/')}
          >
            Historial
          </button>
          
          <button
            className="text-white hover:font-bold transition-all duration-200 px-2 py-1 cursor-not-allowed opacity-60"
            disabled
          >
            Ranking
          </button>
          
          <button
            className={`text-white transition-all duration-200 px-2 py-1 ${
              isActive('/players') 
                ? 'font-bold underline underline-offset-4' 
                : 'hover:font-bold'
            }`}
            onClick={() => handleNavigation('/players')}
          >
            Jugadores
          </button>
        </div>
      </div>
    </nav>
  )
}