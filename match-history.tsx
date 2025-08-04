"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMatches } from "@/hooks/use-matches"
import { Match, MatchPlayer } from "@/lib/mongodb"
import MatchPlayers from "@/components/match-players"

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
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




export default function Component() {
  const { matches, loading, error, refetch } = useMatches(10)
  const router = useRouter()
  const [selectedStat, setSelectedStat] = useState('damage')

  // Handle click on the player row - navigates to match-details with match_id
  const handleRowClick = (player: MatchPlayer, matchId: string) => {
    if (player.summoner_name) {
      // Store the summoner_name in sessionStorage before navigation
      sessionStorage.setItem('highlightedSummonerName', player.summoner_name)
      router.push(`/match-details/${matchId}`)
    }
  }

  // Handle click on profile icon or summoner name - navigates to profile page
  const handleProfileClick = (puuid: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click from triggering
    router.push(`/profile/${puuid}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Historial de Partidas</h1>
            <p className="text-gray-400">Partidas recientes de League of Legends</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Cargando partidas...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Historial de Partidas</h1>
            <p className="text-gray-400">Partidas recientes de League of Legends</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-lg">Error: {error}</div>
            <button 
              onClick={refetch}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 pt-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Historial de Partidas</h1>
          <p className="text-gray-400">Partidas recientes de League of Legends</p>
        </div>

        <div className="space-y-6">
          {matches.map((match) => {
            
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
            const highestMvpScore = Math.max(...playersWithMvp.map(p => p.mvp_score ?? 0))
            
            return (
            <Card key={match.match_id} className="bg-gray-900 border-gray-800 shadow-xl">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
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
                    <span className="text-gray-400 text-sm">
                      {formatMatchDate(match.timestamp)}
                    </span>
                  </div>
                  <div className="text-gray-400 text-lg">{formatDuration(match.game_duration_seconds)}</div>
                </div>
              </CardHeader>

                             <CardContent className="pt-0">
                 <MatchPlayers
                   players={match.players}
                   showOnlyMvp={true}
                   onPlayerClick={(matchId, summonerName) => {
                     const player = match.players.find(p => p.summoner_name === summonerName)
                     if (player) handleRowClick(player, match.match_id)
                   }}
                   onProfileClick={handleProfileClick}
                   matchId={match.match_id}
                   showTeams={false}
                   match={match}
                   selectedStat={selectedStat}
                   onStatChange={setSelectedStat}
                 />
               </CardContent>
            </Card>
          )
          })}
        </div>
      </div>

    </div>
  )
}
