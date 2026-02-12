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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        {/* Logo */}
        <div className="flex cursor-pointer items-center gap-3" onClick={() => handleNavigation('/')}>
          <Image
            src="/logo.png"
            alt="Gordos Tracker Logo"
            width={40}
            height={40}
            className="rounded-xl shadow-lg shadow-cyan-500/20"
          />
          <span className="block text-lg font-semibold tracking-wide text-white">Gordos Tracker</span>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            className={`rounded-xl px-4 py-2 text-sm text-white transition-all duration-200 ${
              isActive('/') 
                ? 'bg-cyan-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]' 
                : 'hover:bg-white/10'
            }`}
            onClick={() => handleNavigation('/')}
          >
            Historial
          </button>
          
          <button
            className="cursor-not-allowed rounded-xl px-4 py-2 text-sm text-white/50"
            disabled
          >
            Ranking
          </button>
          
          <button
            className={`rounded-xl px-4 py-2 text-sm text-white transition-all duration-200 ${
              isActive('/players') 
                ? 'bg-cyan-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]' 
                : 'hover:bg-white/10'
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
