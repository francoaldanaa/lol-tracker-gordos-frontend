"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMatches } from "@/hooks/use-matches"
import { Match, MatchPlayer } from "@/lib/mongodb"

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
  console.log(`Position: ${position}`)
  return colors[key] || "text-gray-400"
}

function getPositionDisplay(position: string): string {
  const normalized = position.toUpperCase()
  if (normalized === "BOTTOM") return "ADC"
  if (normalized === "UTILITY") return "SUPPORT"
  return normalized
}


export default function Component() {
  const { matches, loading, error, refetch } = useMatches(10)

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
            // Determine win based on teams data
            const winningTeam = match.teams.find(team => team.win)
            const isWin = winningTeam ? winningTeam.team_id === 100 : false
            
            // Filter players to only show those with mvp_score
            const playersWithMvp = match.players.filter(player => 
              player.mvp_score !== undefined && 
              player.mvp_score !== null && 
              player.mvp_score > 0
            )
            const highestMvpScore = Math.max(...playersWithMvp.map(p => p.mvp_score ?? 0))
            
            return (
            <Card key={match.match_id} className="bg-gray-900 border-gray-800 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{isWin ? "🏆" : "💀"}</div>
                    <Badge
                      variant={isWin ? "default" : "destructive"}
                      className={`text-sm font-bold ${
                        isWin
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {isWin ? "VICTORIA" : "DERROTA"}
                    </Badge>
                  </div>
                  <div className="text-gray-400 text-sm">{formatDuration(match.game_duration_seconds)}</div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-1">
                                    {/* Show only players with MVP scores */}
                  {playersWithMvp.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        console.log(`Rendering ${playersWithMvp.length} players with MVP scores`)
                        return playersWithMvp.map((player, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                          >
                            <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                              <img
                                src={`/placeholder.svg?height=40&width=40&text=${player.champion_name}`}
                                alt={player.champion_name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-medium truncate">{player.summoner_name}</span>
                                {(() => {
                                  console.log(`Player ${player.summoner_name} position: "${player.position}"`)
                                  const colorClass = getPositionColor(player.position)
                                  console.log(`Color class for ${player.position}: ${colorClass}`)
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
    </div>
  )
}
