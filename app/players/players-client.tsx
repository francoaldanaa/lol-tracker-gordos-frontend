"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Zap, Target } from 'lucide-react'
import Image from 'next/image'

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

function getPositionColor(position: string): string {
  switch (position?.toLowerCase()) {
    case 'top': return 'bg-red-500'
    case 'jungle': return 'bg-green-500'
    case 'middle': return 'bg-blue-500'
    case 'bottom': return 'bg-yellow-500'
    case 'utility': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}

function getPositionDisplay(position: string): string {
  switch (position?.toLowerCase()) {
    case 'utility': return 'Support'
    case 'middle': return 'Mid'
    case 'bottom': return 'ADC'
    default: return position?.charAt(0).toUpperCase() + position?.slice(1) || 'Unknown'
  }
}

function getChampionImageUrl(championName: string): string {
  if (!championName) return '/placeholder.svg'
  // Format champion name for Riot's CDN (remove spaces, apostrophes, etc.)
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${formattedName}.png`
}

export default function PlayersClient() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players')
        if (!response.ok) {
          throw new Error('Failed to fetch players')
        }
        const data = await response.json()
        setPlayers(data.players)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  const handlePlayerClick = (puuid: string) => {
    router.push(`/profile/${puuid}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Jugadores</h1>
          </div>
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-400">Cargando jugadores...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Jugadores</h1>
          </div>
          <div className="flex justify-center items-center py-20">
            <div className="text-red-400">Error: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 pt-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Jugadores de Gordos</h1>
          <p className="text-gray-400 mt-2">Mostrando estadísticas de los últimos 14 días</p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {players.map((player) => {
            const kdaRatio = player.averageKDA.deaths > 0 
              ? ((player.averageKDA.kills + player.averageKDA.assists) / player.averageKDA.deaths)
              : (player.averageKDA.kills + player.averageKDA.assists)

            return (
              <Card 
                key={player.puuid} 
                className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => handlePlayerClick(player.puuid)}
              >
                <CardContent className="p-3">
                  {/* Player Avatar & Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700"
                      title={player.mostPlayedChampion ? `Campeón más jugado: ${player.mostPlayedChampion}` : ''}
                    >
                      {player.mostPlayedChampion ? (
                        <Image
                          src={getChampionImageUrl(player.mostPlayedChampion)}
                          alt={player.mostPlayedChampion}
                          width={40}
                          height={40}
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.svg'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Target className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-sm">{player.summoner_name}</h3>
                      {/* <p className="text-xs text-gray-400 truncate">{player.real_name}</p> */}
                      {player.mainRole && (
                        <Badge 
                          className={`text-xs ${getPositionColor(player.mainRole)} text-white border-0 mt-1`}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          {getPositionDisplay(player.mainRole).toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats Row 1: Matches & Win Rate */}
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-300">{player.totalMatches} partidas</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        player.winRate >= 60 ? 'border-green-500 text-green-400' :
                        player.winRate >= 50 ? 'border-yellow-500 text-yellow-400' :
                        'border-red-500 text-red-400'
                      }`}
                    >
                      {player.winRate.toFixed(1)}% WR
                    </Badge>
                  </div>

                  {/* Stats Row 2: KDA */}
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-300">
                        {player.averageKDA.kills.toFixed(1)}/
                        {player.averageKDA.deaths.toFixed(1)}/
                        {player.averageKDA.assists.toFixed(1)}
                      </span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        kdaRatio >= 2 ? 'border-green-500 text-green-400' :
                        kdaRatio >= 1.5 ? 'border-yellow-500 text-yellow-400' :
                        'border-red-500 text-red-400'
                      }`}
                    >
                      {kdaRatio.toFixed(2)} KDA
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {players.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-400">No se encontraron jugadores con partidas en los últimos 14 días</div>
          </div>
        )}
      </div>
    </div>
  )
}