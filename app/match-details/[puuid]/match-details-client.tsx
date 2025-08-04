"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Match, MatchPlayer } from '@/lib/mongodb'
import MatchPlayers from '@/components/match-players'
import StatsComparison from '@/components/stats-comparison'
import SummonerStatsTooltip from '@/components/summoner-stats-tooltip'
import { useSummonerStats } from '@/hooks/use-summoner-stats'

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getGameType(queueId: number): string {
  // Common queue IDs for League of Legends
  const queueTypes: { [key: number]: string } = {
    400: "NORMAL", // Normal Draft Pick
    420: "RANKED DUO", // Ranked Solo/Duo
    430: "NORMAL", // Normal Blind Pick
    440: "RANKED FLEX", // Ranked Flex
    450: "ARAM",   // ARAM
    700: "CLASH", // Clash
    900: "URF", // URF
    1020: "ONE FOR ALL", // One for All
    1300: "BLITZ", // Nexus Blitz
    1400: "OTRO", // Ultimate Spellbook
  }
  return queueTypes[queueId] || "OTRO"
}

function formatMatchDate(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return `hace ${diffInMinutes} minutos`
  } else if (diffInHours < 24) {
    return `hace ${diffInHours} horas`
  } else if (diffInDays === 1) {
    return "hace 1 día"
  } else if (diffInDays < 7) {
    return `hace ${diffInDays} días`
  } else {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export default function MatchDetailsClient() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedSummonerName, setHighlightedSummonerName] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState('damage')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<MatchPlayer | null>(null)
  const { stats, loading: statsLoading, error: statsError, handleHoverStart, handleHoverEnd } = useSummonerStats()

  useEffect(() => {
    fetchMatch()
    
    // Set page title and description
    document.title = 'Gordos Tracker - Detalles de Partida'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Detalles completos de la partida de League of Legends con estadísticas de jugadores y equipos')
    }
    
    // Check if there's a highlighted summoner name in sessionStorage
    if (typeof window !== 'undefined') {
      const storedHighlightedName = sessionStorage.getItem('highlightedSummonerName')
      if (storedHighlightedName) {
        setHighlightedSummonerName(storedHighlightedName)
        // Clear it after reading to avoid persisting across multiple page visits
        sessionStorage.removeItem('highlightedSummonerName')
      }
    }
  }, [puuid])

  const fetchMatch = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/matches?matchId=${puuid}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch match')
      }
      
      const data = await response.json()
      if (data.matches && data.matches.length > 0) {
        setMatch(data.matches[0])
      } else {
        setError('Match not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching match:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerSelect = (matchId: string, summonerName: string) => {
    setHighlightedSummonerName(summonerName)
  }

  const handleProfileClick = (puuid: string, event: React.MouseEvent) => {
    event.stopPropagation()
    router.push(`/profile/${puuid}`)
  }

  const handlePlayerClick = (summonerName: string) => {
    handlePlayerSelect(match?.match_id || '', summonerName)
  }

  const handleTooltipChange = (position: { x: number; y: number } | null, player: MatchPlayer | null) => {
    setTooltipPosition(position)
    setHoveredPlayer(player)
    if (position && player) {
      handleHoverStart(player.puuid, player.champion_name, player.position)
    } else {
      handleHoverEnd()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">Cargando detalles de la partida...</div>
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

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">Partida no encontrada</div>
          </div>
        </div>
      </div>
    )
  }

  // Check if any tracked summoner won
  const trackedSummoners = match.players.filter(p => 
    p.summoner_name && p.summoner_name.trim() !== '' && 
    p.real_name && p.real_name.trim() !== ''
  )
  
  const winningTeamId = match.teams.find(team => team.win)?.teamId
  const isWin = trackedSummoners.some(player => player.team_id === winningTeamId)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pt-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Match Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="px-3 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">Detalles de partida</h2>
                <span className="text-gray-400 text-sm">{formatMatchDate(match.timestamp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isWin ? "default" : "destructive"}
                  className={`text-sm font-bold px-2 py-1 ${
                    isWin 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isWin ? "🏆 VICTORIA" : "💀 DERROTA"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-sm font-bold px-2 py-1 bg-gray-800 border-gray-600 text-gray-300"
                >
                  {getGameType(match.queue_id)}
                </Badge>
                <span 
                  className="text-gray-400 text-lg font-semibold"
                  title="Duración de la partida"
                >
                  {formatDuration(match.game_duration_seconds)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team 1 (Blue) */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-blue-400">Equipo Azul</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchPlayers
               players={match.players.filter(p => p.team_id === 100)}
               showOnlyMvp={false}
               onPlayerClick={handlePlayerSelect}
               onProfileClick={handleProfileClick}
               matchId={match.match_id}
               showTeams={false}
               highlightedSummonerName={highlightedSummonerName}
               match={match}
               selectedStat={selectedStat}
               onStatChange={setSelectedStat}
               onTooltipChange={handleTooltipChange}
             />
          </CardContent>
        </Card>

        {/* Stats Comparison */}
        <Card className="bg-gray-900 border-gray-800 pt-6 pb-2 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Equipo Azul vs Equipo Rojo</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsComparison
              players={match.players}
              highlightedSummonerName={highlightedSummonerName}
              selectedStat={selectedStat}
              onStatChange={setSelectedStat}
              onPlayerClick={handlePlayerClick}
            />
          </CardContent>
        </Card>

        {/* Team 2 (Red) */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-red-400">Equipo Rojo</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchPlayers
               players={match.players.filter(p => p.team_id === 200)}
               showOnlyMvp={false}
               onPlayerClick={handlePlayerSelect}
               onProfileClick={handleProfileClick}
               matchId={match.match_id}
               showTeams={false}
               highlightedSummonerName={highlightedSummonerName}
               match={match}
               selectedStat={selectedStat}
               onStatChange={setSelectedStat}
               onTooltipChange={handleTooltipChange}
             />
          </CardContent>
        </Card>
        
        {/* Global Tooltip */}
        {tooltipPosition && hoveredPlayer && (
          <div 
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <SummonerStatsTooltip
              stats={stats}
              loading={statsLoading}
              error={statsError}
              championName={hoveredPlayer.champion_name}
              position={hoveredPlayer.position}
            />
          </div>
        )}
      </div>
    </div>
  )
}