"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Player {
  summoner_name: string
  champion_name: string
  kills: number
  deaths: number
  assists: number
  position: string
  gold_earned: number
  total_dmg_dealt: number
  mvp_score?: number // Add this optional field
}

interface Match {
  match_id: string
  win: boolean
  game_duration_seconds: number
  players: Player[]
}

const mockMatches: Match[] = [
  {
    match_id: "NA1_1234567890",
    win: true,
    game_duration_seconds: 1800,
    players: [
      {
        summoner_name: "CoolGuy123",
        champion_name: "Ahri",
        kills: 10,
        deaths: 2,
        assists: 8,
        position: "mid",
        gold_earned: 14500,
        total_dmg_dealt: 20000,
        mvp_score: 8.7,
      },
      {
        summoner_name: "TopLaner99",
        champion_name: "Garen",
        kills: 5,
        deaths: 3,
        assists: 12,
        position: "top",
        gold_earned: 13200,
        total_dmg_dealt: 18500,
      },
      {
        summoner_name: "JungleKing",
        champion_name: "Graves",
        kills: 8,
        deaths: 4,
        assists: 15,
        position: "jungle",
        gold_earned: 12800,
        total_dmg_dealt: 22000,
        mvp_score: 7.8,
      },
      {
        summoner_name: "ADCMain",
        champion_name: "Jinx",
        kills: 12,
        deaths: 1,
        assists: 6,
        position: "bot",
        gold_earned: 16200,
        total_dmg_dealt: 28000,
        mvp_score: 9.2,
      },
      {
        summoner_name: "SupportGod",
        champion_name: "Thresh",
        kills: 2,
        deaths: 5,
        assists: 18,
        position: "support",
        gold_earned: 8500,
        total_dmg_dealt: 12000,
      },
      {
        summoner_name: "EnemyTop",
        champion_name: "Darius",
        kills: 3,
        deaths: 8,
        assists: 4,
        position: "top",
        gold_earned: 10200,
        total_dmg_dealt: 15000,
      },
      {
        summoner_name: "EnemyJungle",
        champion_name: "Lee Sin",
        kills: 6,
        deaths: 7,
        assists: 8,
        position: "jungle",
        gold_earned: 11500,
        total_dmg_dealt: 18000,
      },
      {
        summoner_name: "EnemyMid",
        champion_name: "Yasuo",
        kills: 9,
        deaths: 6,
        assists: 5,
        position: "mid",
        gold_earned: 13800,
        total_dmg_dealt: 24000,
        mvp_score: 7.1,
      },
      {
        summoner_name: "EnemyADC",
        champion_name: "Vayne",
        kills: 7,
        deaths: 9,
        assists: 3,
        position: "bot",
        gold_earned: 12000,
        total_dmg_dealt: 19500,
      },
      {
        summoner_name: "EnemySupport",
        champion_name: "Leona",
        kills: 1,
        deaths: 7,
        assists: 12,
        position: "support",
        gold_earned: 7200,
        total_dmg_dealt: 8500,
      },
    ],
  },
  {
    match_id: "NA1_0987654321",
    win: false,
    game_duration_seconds: 2100,
    players: [
      {
        summoner_name: "CoolGuy123",
        champion_name: "Zed",
        kills: 8,
        deaths: 7,
        assists: 4,
        position: "mid",
        gold_earned: 12500,
        total_dmg_dealt: 18000,
        mvp_score: 6.8,
      },
      {
        summoner_name: "TopLaner99",
        champion_name: "Malphite",
        kills: 2,
        deaths: 6,
        assists: 8,
        position: "top",
        gold_earned: 9800,
        total_dmg_dealt: 12000,
      },
      {
        summoner_name: "JungleKing",
        champion_name: "Kha'Zix",
        kills: 5,
        deaths: 8,
        assists: 6,
        position: "jungle",
        gold_earned: 10200,
        total_dmg_dealt: 16000,
      },
      {
        summoner_name: "ADCMain",
        champion_name: "Caitlyn",
        kills: 6,
        deaths: 5,
        assists: 3,
        position: "bot",
        gold_earned: 11800,
        total_dmg_dealt: 20000,
      },
      {
        summoner_name: "SupportGod",
        champion_name: "Braum",
        kills: 1,
        deaths: 9,
        assists: 10,
        position: "support",
        gold_earned: 6500,
        total_dmg_dealt: 8000,
      },
      {
        summoner_name: "WinnerTop",
        champion_name: "Fiora",
        kills: 12,
        deaths: 3,
        assists: 6,
        position: "top",
        gold_earned: 16500,
        total_dmg_dealt: 25000,
        mvp_score: 9.5,
      },
      {
        summoner_name: "WinnerJungle",
        champion_name: "Elise",
        kills: 9,
        deaths: 4,
        assists: 14,
        position: "jungle",
        gold_earned: 14200,
        total_dmg_dealt: 19000,
      },
      {
        summoner_name: "WinnerMid",
        champion_name: "Orianna",
        kills: 7,
        deaths: 5,
        assists: 11,
        position: "mid",
        gold_earned: 13500,
        total_dmg_dealt: 22000,
      },
      {
        summoner_name: "WinnerADC",
        champion_name: "Kai'Sa",
        kills: 11,
        deaths: 2,
        assists: 8,
        position: "bot",
        gold_earned: 17200,
        total_dmg_dealt: 28500,
        mvp_score: 8.9,
      },
      {
        summoner_name: "WinnerSupport",
        champion_name: "Nautilus",
        kills: 3,
        deaths: 4,
        assists: 16,
        position: "support",
        gold_earned: 8800,
        total_dmg_dealt: 11000,
      },
    ],
  },
]

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
    top: "text-red-400",
    jungle: "text-green-400",
    mid: "text-blue-400",
    bot: "text-yellow-400",
    support: "text-purple-400",
  }
  return colors[position as keyof typeof colors] || "text-gray-400"
}

export default function Component() {
  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Historial de Partidas</h1>
          <p className="text-gray-400">Partidas recientes de League of Legends</p>
        </div>

        <div className="space-y-6">
          {mockMatches.map((match) => (
            <Card key={match.match_id} className="bg-gray-900 border-gray-800 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{match.win ? "🏆" : "💀"}</div>
                    <Badge
                      variant={match.win ? "default" : "destructive"}
                      className={`text-sm font-bold ${
                        match.win
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {match.win ? "VICTORIA" : "DERROTA"}
                    </Badge>
                  </div>
                  <div className="text-gray-400 text-sm">{formatDuration(match.game_duration_seconds)}</div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-1">
                  {/* Team 1 (First 5 players) */}
                  <div className="space-y-1">
                    {match.players.slice(0, 5).map((player, index) => (
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
                            <span className={`text-xs font-medium uppercase ${getPositionColor(player.position)}`}>
                              {player.position}
                            </span>
                            {player.mvp_score && (
                              <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-2 py-0.5 h-5">
                                MVP {player.mvp_score}
                              </Badge>
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
                    ))}
                  </div>

                  <Separator className="bg-gray-700 my-3" />

                  {/* Team 2 (Last 5 players) */}
                  <div className="space-y-1">
                    {match.players.slice(5, 10).map((player, index) => (
                      <div
                        key={index + 5}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
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
                            <span className={`text-xs font-medium uppercase ${getPositionColor(player.position)}`}>
                              {player.position}
                            </span>
                            {player.mvp_score && (
                              <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-2 py-0.5 h-5">
                                MVP {player.mvp_score}
                              </Badge>
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
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
