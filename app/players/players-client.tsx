"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { getChampionImageUrl, getPositionBgColor, getPositionDisplay, formatNumber, calculateKDA } from "@/lib/game-utils"

interface PlayerStats {
  puuid: string
  summoner_name: string
  real_name: string
  totalMatches: number
  winRate: number
  averageKDA: {
    kills: number
    deaths: number
    assists: number
  }
  mostPlayedChampion: string | null
  mainRole: string | null
}

export default function PlayersClient() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch("/api/players")
        if (!response.ok) throw new Error("Failed to fetch players")
        const data = await response.json()
        setPlayers(data.players || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  const topWinrate = useMemo(() => Math.max(0, ...players.map((player) => player.winRate)), [players])

  if (loading) {
    return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Cargando jugadores...</div></div>
  }

  if (error) {
    return <div className="page-wrap"><div className="glass-shell p-6 text-center text-rose-300">Error: {error}</div></div>
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="glass-shell p-6">
        <p className="glass-chip mb-4">Roster</p>
        <h1 className="title-gradient text-4xl font-semibold">Jugadores de Gordos</h1>
        <p className="mt-2 text-sm text-slate-200/80">Estadísticas de los últimos 14 días. Click en cualquier jugador para abrir su perfil.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {players.map((player) => {
          const kda = calculateKDA(player.averageKDA.kills, player.averageKDA.deaths, player.averageKDA.assists)
          const isLeader = player.winRate === topWinrate && player.totalMatches > 0
          return (
            <Card
              key={player.puuid}
              className="glass-shell cursor-pointer border-white/15 bg-white/[0.06] transition-all duration-200 hover:-translate-y-1"
              onClick={() => router.push(`/profile/${player.puuid}`)}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-black/20">
                    {player.mostPlayedChampion ? (
                      <Image
                        src={getChampionImageUrl(player.mostPlayedChampion)}
                        alt={player.mostPlayedChampion}
                        width={48}
                        height={48}
                        className="block h-full w-full scale-110 object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{player.summoner_name}</div>
                    {player.mainRole ? (
                      <Badge className={`${getPositionBgColor(player.mainRole)} mt-1 border-0 text-[10px] text-white`}>
                        {getPositionDisplay(player.mainRole)}
                      </Badge>
                    ) : null}
                  </div>
                  {isLeader ? <span className="glass-chip border-emerald-300/45 bg-emerald-300/20 text-emerald-100">Top WR</span> : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="glass-card p-2">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-300/70">Partidas</div>
                    <div className="text-lg font-semibold text-white">{player.totalMatches}</div>
                  </div>
                  <div className="glass-card p-2">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-300/70">Winrate</div>
                    <div className={`text-lg font-semibold ${player.winRate >= 55 ? "text-emerald-200" : player.winRate >= 50 ? "text-amber-100" : "text-rose-200"}`}>
                      {formatNumber(player.winRate)}%
                    </div>
                  </div>
                </div>

                <div className="mt-2 glass-card p-2 text-sm">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-300/70">KDA Promedio</div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-100">
                      {formatNumber(player.averageKDA.kills)}/{formatNumber(player.averageKDA.deaths)}/{formatNumber(player.averageKDA.assists)}
                    </span>
                    <span className="font-semibold text-cyan-100">{formatNumber(kda, 2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
