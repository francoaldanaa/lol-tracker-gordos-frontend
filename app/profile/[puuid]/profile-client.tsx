"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trophy, Target, Eye, MapPin, Users, Users2, Clock } from 'lucide-react'

interface PlayerProfile {
  puuid: string
  summoner_name: string
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
  average_pings?: number
  average_danger_pings?: number
  average_push_pings?: number
  average_retreat_pings?: number
  average_all_in_pings?: number
  average_assist_me_pings?: number
  average_basic_pings?: number
  average_command_pings?: number
  average_enemy_missing_pings?: number
  average_enemy_vision_pings?: number
  average_get_back_pings?: number
  average_hold_pings?: number
  average_need_vision_pings?: number
  average_on_my_way_pings?: number
  average_vision_cleared_pings?: number
  most_played_champions: Array<{ 
    champion: string; 
    games: number;
    wins?: number;
    losses?: number;
    win_rate?: number;
    average_kills?: number;
    average_deaths?: number;
    average_assists?: number;
    average_kd?: number;
  }>
  most_played_positions: Array<{ position: string; games: number }>
  teammates_stats: Array<{
    puuid: string
    summoner_name: string
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
  // Normalize the position string
  const normalizedPosition = position?.toUpperCase().trim()
  
  switch (normalizedPosition) {
    case 'TOP': return 'TOP'
    case 'JUNGLE': return 'JUNGLE'
    case 'MIDDLE': return 'MID'
    case 'BOTTOM': return 'ADC'
    case 'UTILITY': return 'SUPPORT'
    case 'SUPPORT': return 'SUPPORT'
    case 'ADC': return 'ADC'
    case 'MID': return 'MID'
    case 'JG': return 'JUNGLE'
    case 'JUNGLER': return 'JUNGLE'
    case '': return 'UNKNOWN'
    case null:
    case undefined: return 'UNKNOWN'
    default: 
      console.warn('Unknown position value:', position)
      return position || 'UNKNOWN'
  }
}

export default function ProfileClient() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')

  useEffect(() => {
    fetchProfile()
    
    // Set page title and description
    document.title = 'Gordos Tracker - Perfil de Jugador'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Perfil detallado del jugador con estadísticas, historial de partidas y análisis de rendimiento')
    }
  }, [puuid, gameTypeFilter, positionFilter])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (gameTypeFilter !== 'all') {
        params.append('gameType', gameTypeFilter)
      }
      if (positionFilter !== 'all' && gameTypeFilter !== 'aram' && gameTypeFilter !== 'urf') {
        params.append('position', positionFilter)
      }
      
      const url = `/api/player/${puuid}${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      setProfile(data.profile)
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

  const handleGameTypeChange = (value: string) => {
    setGameTypeFilter(value)
    if (value === 'aram' || value === 'urf') {
      setPositionFilter('all')
    }
  }

  const handlePositionChange = (value: string) => {
    setPositionFilter(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
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
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
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
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">Perfil no encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Perfil del Jugador</h1>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Tipo de Juego:</span>
            <Select value={gameTypeFilter} onValueChange={handleGameTypeChange}>
              <SelectTrigger className="w-56 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-gray-700">Todos (sin URF/ARAM)</SelectItem>
                <SelectItem value="ranked-solo" className="text-white hover:bg-gray-700">Ranked Solo/Duo</SelectItem>
                <SelectItem value="ranked-flex" className="text-white hover:bg-gray-700">Ranked Flex</SelectItem>
                <SelectItem value="normal" className="text-white hover:bg-gray-700">Normal</SelectItem>
                <SelectItem value="aram" className="text-white hover:bg-gray-700">ARAM</SelectItem>
                <SelectItem value="urf" className="text-white hover:bg-gray-700">URF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Posición:</span>
            <Select 
              value={positionFilter} 
              onValueChange={handlePositionChange}
              disabled={gameTypeFilter === 'aram' || gameTypeFilter === 'urf'}
            >
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white disabled:opacity-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-gray-700">Todas</SelectItem>
                <SelectItem value="TOP" className="text-white hover:bg-gray-700">Top</SelectItem>
                <SelectItem value="JUNGLE" className="text-white hover:bg-gray-700">Jungle</SelectItem>
                <SelectItem value="MIDDLE" className="text-white hover:bg-gray-700">Mid</SelectItem>
                <SelectItem value="BOTTOM" className="text-white hover:bg-gray-700">ADC</SelectItem>
                <SelectItem value="UTILITY" className="text-white hover:bg-gray-700">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Player Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{profile.summoner_name}</h2>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="text-center">
                  <div className="text-white font-medium text-lg">{profile.total_matches}</div>
                  <div className="text-gray-400">Partidas</div>
                </div>
                <div className="text-center">
                  <div className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded font-bold text-lg">
                    🏆 {profile.recent_matches?.filter(match => match.mvp_score && match.mvp_score > 0).length || 0}
                  </div>
                  <div className="text-gray-400">MVP</div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-pointer">
                        <div className="text-blue-400 font-medium text-lg">{profile.win_rate ? profile.win_rate.toFixed(1) : '0.0'}%</div>
                        <div className="text-gray-400">Winrate</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-white">
                      <div className="text-green-400">{profile.wins} victorias</div>
                      <div className="text-red-400">{profile.losses} derrotas</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Performance Stats moved here */}
            <Separator className="bg-gray-700 mb-6" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{profile.average_kills ? profile.average_kills.toFixed(1) : '0.0'}</div>
                    <div className="text-sm text-gray-400">K</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-400">/</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{profile.average_deaths ? profile.average_deaths.toFixed(1) : '0.0'}</div>
                    <div className="text-sm text-gray-400">D</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-400">/</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{profile.average_assists ? profile.average_assists.toFixed(1) : '0.0'}</div>
                    <div className="text-sm text-gray-400">A</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{(((profile.average_kills || 0) + (profile.average_assists || 0)) / Math.max((profile.average_deaths || 1), 1)).toFixed(2)}</div>
                  <div className="text-sm text-gray-400">KD</div>
                </div>
              </div>
              <Separator className="bg-gray-700" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.average_mvp_score ? profile.average_mvp_score.toFixed(1) : '0.0'}</div>
                  <div className="text-sm text-gray-400">MVP Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{profile.average_damage_to_champions ? formatDamage(profile.average_damage_to_champions) : '0.0k'} <span className="text-lg">⚔️</span></div>
                  <div className="text-sm text-gray-400">Daño a Campeones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{profile.average_gold_earned ? formatGold(profile.average_gold_earned) : '0.0k'} <span className="text-lg">💰</span></div>
                  <div className="text-sm text-gray-400">Oro Ganado</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positions and Champions side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Played Positions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5" />
                Posiciones Más Jugadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(profile.most_played_positions || []).slice(0, 5).map((position, index) => (
                   <div key={position.position} className="flex justify-between items-center">
                     <span className={`font-medium ${getPositionColor(position.position)}`}>
                       {getPositionDisplay(position.position) || `[${position.position}]`}
                     </span>
                     <Badge variant="outline" className="bg-gray-800 border-gray-600 text-gray-300">
                       {position.games} partidas
                     </Badge>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Played Champions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="h-5 w-5" />
                Campeones Más Jugados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(profile.most_played_champions || []).slice(0, 5).map((champion, index) => (
                  <div key={champion.champion} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${champion.champion}.png`}
                          alt={champion.champion}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'block';
                            }
                          }}
                        />
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-300" style={{display: 'none'}}>
                          {champion.champion.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-white">{champion.champion}</div>
                        <div className="text-xs text-gray-400">{champion.games} partidas</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-gray-400">KDA</div>
                        <div className="text-white">
                          <span className="text-green-400">{champion.average_kills ? champion.average_kills.toFixed(1) : '0.0'}</span>/
                          <span className="text-red-400">{champion.average_deaths ? champion.average_deaths.toFixed(1) : '0.0'}</span>/
                          <span className="text-blue-400">{champion.average_assists ? champion.average_assists.toFixed(1) : '0.0'}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">KD</div>
                        <div className="text-purple-400 font-medium">
                          {champion.average_kd ? champion.average_kd.toFixed(2) : 
                           (((champion.average_kills || 0) + (champion.average_assists || 0)) / Math.max((champion.average_deaths || 1), 1)).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">WR</div>
                        <div className={`font-medium ${(champion.win_rate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {champion.win_rate ? champion.win_rate.toFixed(1) : '0.0'}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches - Full Width */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
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
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => handleMatchClick(match.match_id, profile.summoner_name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Win/Loss Badge */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isWin 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {isWin ? 'V' : 'D'}
                        </div>
                        
                        {/* Champion and KDA */}
                        <div className="flex flex-col">
                          <span className="text-white font-semibold">{playerData?.champion_name}</span>
                          <span className="text-sm text-gray-400">
                            <span className="text-green-400">{playerData?.kills}</span>/
                            <span className="text-red-400">{playerData?.deaths}</span>/
                            <span className="text-blue-400">{playerData?.assists}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Date */}
                        <div className="text-center">
                          <div className="text-white font-medium text-sm">
                            {new Date(match.timestamp).toLocaleDateString('es-ES')}
                          </div>
                          <div className="text-gray-400 text-xs">Fecha</div>
                        </div>
                        
                        {/* MVP Score */}
                        <div className="text-center">
                          <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-sm font-bold">
                            {playerData?.mvp_score?.toFixed(1) || 'N/A'}
                          </div>
                          <div className="text-gray-400 text-xs">MVP</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bottom section: Teammates and Vision Stats side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teammates Stats - Half Width, Removed KDA and MVP columns */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5" />
                  Estadísticas con Compañeros
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 text-gray-300 font-semibold">Jugador</th>
                      <th className="text-center py-2 text-gray-300 font-semibold">Partidas</th>
                      <th className="text-center py-2 text-gray-300 font-semibold">Victorias</th>
                      <th className="text-center py-2 text-gray-300 font-semibold">Winrate</th>
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
                            <div className="font-medium text-white">{teammate.summoner_name}</div>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-300">{teammate.games_played}</td>
                        <td className="text-center py-3 text-green-400">{teammate.wins}</td>
                        <td className="text-center py-3">
                          <Badge 
                            variant={(teammate.win_rate || 0) >= 50 ? "default" : "destructive"}
                            className={(teammate.win_rate || 0) >= 50 ? "bg-green-600" : "bg-red-600"}
                          >
                            {teammate.win_rate ? teammate.win_rate.toFixed(1) : '0.0'}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Vision Stats - Half Width */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
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
                  <span className="font-bold text-green-400">{profile.average_wards_placed ? profile.average_wards_placed.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wards Destruidas</span>
                  <span className="font-bold text-yellow-400">{profile.average_wards_killed ? profile.average_wards_killed.toFixed(1) : '0.0'}</span>
                </div>
              </div>
              <Separator className="my-4 bg-gray-700" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">📢 Pings Totales</span>
                  <span className="font-bold text-blue-400">{profile.average_pings ? profile.average_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">⚠️ Pings de Peligro</span>
                  <span className="font-bold text-orange-400">{profile.average_danger_pings ? profile.average_danger_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🔄 Pings de Retirada</span>
                  <span className="font-bold text-yellow-400">{profile.average_retreat_pings ? profile.average_retreat_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">⚡ Pings de Ataque</span>
                  <span className="font-bold text-red-400">{profile.average_all_in_pings ? profile.average_all_in_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🤝 Pings de Ayuda</span>
                  <span className="font-bold text-green-400">{profile.average_assist_me_pings ? profile.average_assist_me_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">👁️ Enemigo Desaparecido</span>
                  <span className="font-bold text-purple-400">{profile.average_enemy_missing_pings ? profile.average_enemy_missing_pings.toFixed(1) : '0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🚶 En Camino</span>
                  <span className="font-bold text-cyan-400">{profile.average_on_my_way_pings ? profile.average_on_my_way_pings.toFixed(1) : '0.0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  )
}