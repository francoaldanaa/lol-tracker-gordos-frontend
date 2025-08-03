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
  return (gold / 1000).toFixed(1) + 'k'
}

function formatDamage(damage: number): string {
  return (damage / 1000).toFixed(1) + 'k'
}

function getPositionColor(position: string): string {
  switch (position) {
    case 'TOP': return 'text-blue-400'
    case 'JUNGLE': return 'text-green-400'
    case 'MIDDLE': return 'text-yellow-400'
    case 'BOTTOM': return 'text-red-400'
    case 'UTILITY': return 'text-purple-400'
    default: return 'text-gray-400'
  }
}

function getPositionDisplay(position: string): string {
  switch (position) {
    case 'MIDDLE': return 'MID'
    case 'BOTTOM': return 'ADC'
    case 'UTILITY': return 'SUPPORT'
    default: return position
  }
}

export default function ProfileClient() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
    
    // Set page title and description
    document.title = 'Gordos Tracker - Perfil de Jugador'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Perfil detallado del jugador con estadísticas, historial de partidas y análisis de rendimiento')
    }
  }, [puuid])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/player/${puuid}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMatchClick = (matchId: string, summonerName: string) => {
    // Store the summoner name in sessionStorage to highlight it in match details
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('highlightedSummonerName', summonerName)
    }
    router.push(`/match-details/${matchId}`)
  }

  const handleTeammateClick = (teammatePuuid: string) => {
    router.push(`/profile/${teammatePuuid}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">Cargando perfil...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-red-400">Error: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">Perfil no encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Perfil del Jugador</h1>
        </div>

        {/* Player Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{profile.summoner_name}</h2>
                <p className="text-gray-400 text-lg">{profile.real_name}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{profile.total_matches}</div>
                  <div className="text-sm text-gray-400">Partidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{profile.wins}</div>
                  <div className="text-sm text-gray-400">Victorias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{profile.losses}</div>
                  <div className="text-sm text-gray-400">Derrotas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.win_rate ? profile.win_rate.toFixed(1) : '0.0'}%</div>
                  <div className="text-sm text-gray-400">Winrate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Stats */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Estadísticas de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{profile.average_kills ? profile.average_kills.toFixed(1) : '0.0'}</div>
                  <div className="text-sm text-gray-400">Kills</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">{profile.average_deaths ? profile.average_deaths.toFixed(1) : '0.0'}</div>
                  <div className="text-sm text-gray-400">Deaths</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{profile.average_assists ? profile.average_assists.toFixed(1) : '0.0'}</div>
                  <div className="text-sm text-gray-400">Assists</div>
                </div>
              </div>
              <Separator className="bg-gray-700" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">MVP Score Promedio</span>
                  <span className="font-bold text-yellow-400">{profile.average_mvp_score ? profile.average_mvp_score.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daño Total</span>
                  <span className="font-bold">{profile.average_damage_dealt ? formatDamage(profile.average_damage_dealt) : '0.0k'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daño a Campeones</span>
                  <span className="font-bold">{profile.average_damage_to_champions ? formatDamage(profile.average_damage_to_champions) : '0.0k'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Oro Ganado</span>
                  <span className="font-bold text-yellow-400">{profile.average_gold_earned ? formatGold(profile.average_gold_earned) : '0.0k'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vision Stats */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Estadísticas de Visión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Vision Score</span>
                  <span className="font-bold text-purple-400">{profile.average_vision_score ? profile.average_vision_score.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wards Colocadas</span>
                  <span className="font-bold">{profile.average_wards_placed ? profile.average_wards_placed.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wards Destruidas</span>
                  <span className="font-bold">{profile.average_wards_killed ? profile.average_wards_killed.toFixed(1) : '0.0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Played Champions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Campeones Más Jugados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(profile.most_played_champions || []).slice(0, 5).map((champion, index) => (
                  <div key={champion.champion} className="flex justify-between items-center">
                    <span className="font-medium">{champion.champion}</span>
                    <Badge variant="outline" className="bg-gray-800 border-gray-600">
                      {champion.games} partidas
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Played Positions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Posiciones Más Jugadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(profile.most_played_positions || []).slice(0, 5).map((position, index) => (
                  <div key={position.position} className="flex justify-between items-center">
                    <span className={`font-medium ${getPositionColor(position.position)}`}>
                      {getPositionDisplay(position.position)}
                    </span>
                    <Badge variant="outline" className="bg-gray-800 border-gray-600">
                      {position.games} partidas
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teammates Stats */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Estadísticas con Compañeros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Jugador</th>
                    <th className="text-center py-2">Partidas</th>
                    <th className="text-center py-2">Victorias</th>
                    <th className="text-center py-2">Winrate</th>
                    <th className="text-center py-2">KDA</th>
                    <th className="text-center py-2">MVP Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.teammates_stats || []).map((teammate) => (
                    <tr 
                      key={teammate.puuid} 
                      className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleTeammateClick(teammate.puuid)}
                    >
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{teammate.summoner_name}</div>
                          <div className="text-sm text-gray-400">{teammate.real_name}</div>
                        </div>
                      </td>
                      <td className="text-center py-3">{teammate.games_played}</td>
                      <td className="text-center py-3 text-green-400">{teammate.wins}</td>
                      <td className="text-center py-3">
                        <Badge 
                          variant={(teammate.win_rate || 0) >= 50 ? "default" : "destructive"}
                          className={(teammate.win_rate || 0) >= 50 ? "bg-green-600" : "bg-red-600"}
                        >
                          {teammate.win_rate ? teammate.win_rate.toFixed(1) : '0.0'}%
                        </Badge>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-sm">
                          {teammate.average_kills ? teammate.average_kills.toFixed(1) : '0.0'}/
                          {teammate.average_deaths ? teammate.average_deaths.toFixed(1) : '0.0'}/
                          {teammate.average_assists ? teammate.average_assists.toFixed(1) : '0.0'}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-yellow-400 font-medium">
                          {teammate.average_mvp_score ? teammate.average_mvp_score.toFixed(1) : '0.0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Partidas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(profile.recent_matches || []).slice(0, 10).map((match, index) => {
                const playerData = (match.players || []).find((p: any) => p.puuid === profile.puuid)
                const isWin = (match.teams || []).find((t: any) => t.teamId === playerData?.team_id)?.win
                
                return (
                  <div 
                    key={match.match_id} 
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleMatchClick(match.match_id, profile.summoner_name)}
                  >
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={isWin ? "default" : "destructive"}
                        className={`text-xs ${isWin ? "bg-green-600" : "bg-red-600"}`}
                      >
                        {isWin ? "V" : "D"}
                      </Badge>
                      <div>
                        <div className="font-medium">{playerData?.champion_name}</div>
                        <div className="text-sm text-gray-400">
                          {playerData?.kills}/{playerData?.deaths}/{playerData?.assists}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        {new Date(match.timestamp).toLocaleDateString('es-ES')}
                      </div>
                      <div className="text-xs text-gray-500">
                        MVP: {playerData?.mvp_score?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}