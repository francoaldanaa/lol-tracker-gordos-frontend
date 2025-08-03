"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft } from 'lucide-react'
import { Match, MatchPlayer } from '@/lib/mongodb'
import MatchPlayers from '@/components/match-players'
import StatsComparison from '@/components/stats-comparison'



function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}



function getGameType(queueId: number): string {
  const queueTypes: { [key: number]: string } = {
    400: "NORMAL",
    420: "RANKED Duo",
    430: "NORMAL",
    440: "RANKED Flex",
    450: "ARAM",
    700: "NORMAL",
    900: "NORMAL",
    1020: "NORMAL",
    1300: "NORMAL",
    1400: "NORMAL",
  }
  return queueTypes[queueId] || "NORMAL"
}

function formatMatchDate(timestamp: string): string {
  const matchDate = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
  
  const timeString = matchDate.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
  
  if (matchDay.getTime() === today.getTime()) {
    return `Hoy ${timeString}`
  } else if (matchDay.getTime() === yesterday.getTime()) {
    return `Ayer ${timeString}`
  } else {
    return `${matchDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })} ${timeString}`
  }
}

export default function MatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedSummonerName, setHighlightedSummonerName] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState('damage')

  useEffect(() => {
    fetchMatch()
    
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
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/matches?matchId=${encodeURIComponent(puuid)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch match')
      }

      if (data.matches && data.matches.length > 0) {
        setMatch(data.matches[0])
      } else {
        throw new Error('Match not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerSelect = (matchId: string, summonerName: string) => {
    // Update local state instead of URL to prevent scrolling
    // If summonerName is empty, clear the highlight
    setHighlightedSummonerName(summonerName || null);
  }

  const handlePlayerClick = (summonerName: string) => {
    handlePlayerSelect(match?.match_id || '', summonerName);
  }

  const handleProfileClick = (puuid: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click from triggering
    router.push(`/profile/${puuid}`)
  }

  const handleBack = () => {
    router.push('/') // Keep using push for navigation to a different page
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Cargando detalles de la partida...</div>
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
            <Button onClick={fetchMatch} className="ml-4">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400 text-lg">Partida no encontrada</div>
          </div>
        </div>
      </div>
    )
  }

  // Filter players to only show those with mvp_score
  const playersWithMvp = match.players.filter(player => 
    player.mvp_score !== undefined && 
    player.mvp_score !== null && 
    player.mvp_score > 0
  )

  let isWin = false
  if (playersWithMvp.length > 0) {
    const playerTeamId = playersWithMvp[0].team_id
    const team = match.teams.find(t => t.teamId === playerTeamId)
    isWin = team?.win === true
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
            Detalles de la partida - {formatMatchDate(match.timestamp)}
          </h1>
          
          <div className="flex items-center gap-3">
            <Badge
              variant={isWin ? "default" : "destructive"}
              className={`text-sm font-bold px-3 py-1 ${
                isWin
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isWin ? "🏆 VICTORIA" : "💀 DERROTA"}
            </Badge>
            <Badge
              variant="outline"
              className="text-sm font-bold px-3 py-1 bg-gray-800 border-gray-600 text-gray-300"
            >
              {getGameType(match.queue_id)}
            </Badge>
            <span className="text-gray-400 text-lg">
              {formatDuration(match.game_duration_seconds)}
            </span>
          </div>
        </div>

        {/* Team 1 (Blue) */}
        <Card className="bg-gray-900 border-gray-800">
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
             />
          </CardContent>
        </Card>

        {/* Stats Comparison */}
        <Card className="bg-gray-900 border-gray-800 py-6">
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
             />
          </CardContent>
        </Card>


       </div>
     </div>
   )
 }