"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMatches } from "@/hooks/use-matches"
import { Match, MatchPlayer } from "@/lib/mongodb"
import PlayerProfileModal from "@/components/player-profile-modal"

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
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

function getGameType(queueId: number): string {
  // Common queue IDs for League of Legends
  const queueTypes: { [key: number]: string } = {
    400: "NORMAL", // Normal Draft Pick
    420: "RANKED Duo", // Ranked Solo/Duo
    430: "NORMAL", // Normal Blind Pick
    440: "RANKED Flex", // Ranked Flex
    450: "ARAM",   // ARAM
    700: "NORMAL", // Clash
    900: "NORMAL", // URF
    1020: "NORMAL", // One for All
    1300: "NORMAL", // Nexus Blitz
    1400: "NORMAL", // Ultimate Spellbook
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


export default function Component() {
  const { matches, loading, error, refetch } = useMatches(10)
  const [selectedPlayerPuuid, setSelectedPlayerPuuid] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePlayerClick = (puuid: string) => {
    setSelectedPlayerPuuid(puuid)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlayerPuuid(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
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
      <div className="min-h-screen bg-gray-950 p-4 md:p-6">
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
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
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
                <div className="space-y-1">
                  {/* Show only players with MVP scores */}
                  {playersWithMvp.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        return playersWithMvp.map((player, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={() => handlePlayerClick(player.puuid)}
                          >
                            <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                            <img
                              src={`/assets/img/champion/${player.champion_name}.png`}
                              onLoad={() => {
                                console.log(`✅ Champion image found: /assets/img/champion/${player.champion_name}.png`)
                              }}
                              onError={(e) => {
                                console.log(`❌ Champion image not found: /assets/img/champion/${player.champion_name}.png`)
                                e.currentTarget.onerror = null // Prevent infinite loop
                                e.currentTarget.src = `/placeholder.svg?height=40&width=40&text=${player.champion_name}`
                              }}
                              alt={player.champion_name}
                              className="w-full h-full object-cover"
                            />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-medium truncate">{player.summoner_name}</span>
                                {(() => {
                                  const colorClass = getPositionColor(player.position)
                                  return (
                                    <span className={`text-xs font-medium uppercase ${colorClass}`}>
                                      {getPositionDisplay(player.position)}
                                    </span>
                                  )
                                })()}
                                {player.mvp_score !== undefined && (
                                  <>
                                    <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-2 py-0.5 h-5">
                                      {player.mvp_score.toFixed(2)}
                                    </Badge>
                                    {player.mvp_score === highestMvpScore && (
                                      <Badge className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 h-5">
                                        ⭐ MVP
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="text-gray-400 text-sm truncate">{player.champion_name}</div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-green-400 font-bold">{player.kills}</div>
                                <div className="text-xs text-gray-500">K</div>
                              </div>
                              <div className="text-gray-400">/</div>
                              <div className="text-center">
                                <div className="text-red-400 font-bold">{player.deaths}</div>
                                <div className="text-xs text-gray-500">D</div>
                              </div>
                              <div className="text-gray-400">/</div>
                              <div className="text-center">
                                <div className="text-yellow-400 font-bold">{player.assists}</div>
                                <div className="text-xs text-gray-500">A</div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end text-xs text-gray-400 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">💰</span>
                                <span>{formatGold(player.gold_earned)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-red-500">⚔️</span>
                                <span>{formatDamage(player.total_dmg_dealt)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No players with MVP scores found in this match.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
          })}
        </div>
      </div>

      <PlayerProfileModal
        puuid={selectedPlayerPuuid}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
