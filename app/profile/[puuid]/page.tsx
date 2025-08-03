"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Trophy, Target, Zap, Eye, MapPin, Users, Users2 } from 'lucide-react'

interface PlayerProfile {
  puuid: string
  summoner_name: string
  real_name: string
  total_matches: number
  wins: number
  losses: number
  win_rate: number
  average_kills: number
  average_deaths: number
  average_assists: number
  average_mvp_score: number
  average_damage_dealt: number
  average_damage_to_champions: number
  average_gold_earned: number
  average_vision_score: number
  average_wards_placed: number
  average_wards_killed: number
  most_played_champions: Array<{ champion: string; games: number }>
  most_played_positions: Array<{ position: string; games: number }>
  teammates_stats: Array<{
    puuid: string
    summoner_name: string
    real_name: string
    games_played: number
    wins: number
    losses: number
    win_rate: number
    average_kills: number
    average_deaths: number
    average_assists: number
    average_mvp_score: number
  }>
  recent_matches: any[]
}

function formatGold(gold: number): string {
  return `${(gold / 1000).toFixed(1)}k`
}

function formatDamage(damage: number): string {
  return `${(damage / 1000).toFixed(1)}k`
}

function getPositionColor(position: string): string {
  const colors = {
    TOP: "text-red-400",
    JUNGLE: "text-green-400",
    MIDDLE: "text-blue-400",
    BOTTOM: "text-yellow-400",
    UTILITY: "text-purple-400",
  }

  const key = position.toUpperCase() as keyof typeof colors
  return colors[key] || "text-gray-400"
}

function getPositionDisplay(position: string): string {
  const normalized = position.toUpperCase()
  if (normalized === "MIDDLE") return "MID"
  if (normalized === "BOTTOM") return "ADC"
  if (normalized === "UTILITY") return "SUPPORT"
  return normalized
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [puuid])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/player/${encodeURIComponent(puuid)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Cargando perfil...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-lg">Error: {error}</div>
            <Button onClick={fetchProfile} className="ml-4">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 text-lg">Perfil no encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Perfil de {profile.summoner_name}
          </h1>
        </div>

        {/* Player Profile */}
        <div className="space-y-6">
          {/* Header Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Users className="h-6 w-6" />
                {profile.summoner_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.total_matches}</div>
                  <div className="text-sm text-gray-400">Partidas Totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{profile.wins}</div>
                  <div className="text-sm text-gray-400">Victorias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{profile.losses}</div>
                  <div className="text-sm text-gray-400">Derrotas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.win_rate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KDA Stats */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5" />
                Estadísticas KDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{profile.average_kills.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Kills Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{profile.average_deaths.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Deaths Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{profile.average_assists.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Assists Promedio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-violet-400">{profile.average_mvp_score.toFixed(2)}</div>
                  <div className="text-sm text-gray-400">MVP Score Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-500">{formatDamage(profile.average_damage_dealt)}</div>
                  <div className="text-sm text-gray-400">Daño Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-500">{formatGold(profile.average_gold_earned)}</div>
                  <div className="text-sm text-gray-400">Oro Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{profile.average_vision_score.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Vision Score Promedio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vision Stats */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Estadísticas de Visión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{profile.average_wards_placed.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Wards Colocadas Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">{profile.average_wards_killed.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">Wards Destruidas Promedio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Most Played Champions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Campeones Más Jugados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.most_played_champions.map((champ, index) => (
                  <div key={champ.champion} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-600 flex items-center justify-center overflow-hidden">
                        <img
                          src={`/assets/img/champion/${champ.champion}.png`}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = `/placeholder.svg?height=32&width=32&text=${champ.champion}`
                          }}
                          alt={champ.champion}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-white font-medium">{champ.champion}</span>
                    </div>
                    <span className="text-gray-300 text-sm">{champ.games} partidas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Played Positions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Posiciones Más Jugadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.most_played_positions.map((pos, index) => (
                  <div key={pos.position} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${getPositionColor(pos.position)}`}>
                        {getPositionDisplay(pos.position)}
                      </span>
                    </div>
                    <Badge variant="secondary">{pos.games} partidas</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teammates Statistics */}
          {profile.teammates_stats.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Estadísticas con Compañeros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.teammates_stats.map((teammate, index) => (
                    <div key={teammate.puuid} className="p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{teammate.summoner_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">{teammate.games_played} partidas</div>
                          <div className={`text-sm font-bold ${teammate.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {teammate.win_rate.toFixed(1)}% WR
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-green-400 font-bold">{teammate.average_kills.toFixed(1)}</div>
                          <div className="text-gray-500">K</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-400 font-bold">{teammate.average_deaths.toFixed(1)}</div>
                          <div className="text-gray-500">D</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 font-bold">{teammate.average_assists.toFixed(1)}</div>
                          <div className="text-gray-500">A</div>
                        </div>
                        <div className="text-center">
                          <div className="text-violet-400 font-bold">{teammate.average_mvp_score.toFixed(2)}</div>
                          <div className="text-gray-500">MVP</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        {teammate.wins}W - {teammate.losses}L
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}