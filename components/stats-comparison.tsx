"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MatchPlayer } from "@/lib/mongodb"
import { getChampionImageUrl } from "@/lib/game-utils"

interface StatsComparisonProps {
  players: MatchPlayer[]
  highlightedSummonerName?: string | null
  selectedStat?: string
  onStatChange?: (stat: string) => void
  onPlayerClick?: (summonerName: string) => void
}

function getPlayerName(player: MatchPlayer): string {
  return player.summoner_name || player.riot_id_game_name || "Desconocido"
}

function getStatValue(player: MatchPlayer, stat: string): number {
  switch (stat) {
    case "oro":
      return player.gold_earned || 0
    case "damage":
      return player.total_dmg_dealt_champions || 0
    case "healing":
      return player.healing_done || 0
    case "tiempo_muerto":
      return player.total_time_spent_dead || 0
    case "minions":
      return player.total_minions_killed || 0
    case "cc":
      return player.total_time_cc_dealt || 0
    case "vision":
      return player.vision_score || 0
    case "pings":
      return (
        player.all_in_pings +
        player.assist_me_pings +
        player.basic_pings +
        player.command_pings +
        player.danger_pings +
        player.enemy_missing_pings +
        player.enemy_vision_pings +
        player.get_back_pings +
        player.hold_pings +
        player.need_vision_pings +
        player.on_my_way_pings +
        player.push_pings +
        player.retreat_pings +
        player.vision_cleared_pings
      )
    default:
      return player.total_dmg_dealt_champions || 0
  }
}

function formatTooltipValue(value: number, stat: string): string {
  if (stat === "tiempo_muerto" || stat === "cc") {
    const minutes = Math.floor(value / 60)
    const seconds = value % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }
  return value.toLocaleString()
}

export default function StatsComparison({
  players,
  highlightedSummonerName,
  selectedStat = "damage",
  onStatChange,
  onPlayerClick,
}: StatsComparisonProps) {
  const [currentStat, setCurrentStat] = useState(selectedStat)

  useEffect(() => {
    const savedStat = localStorage.getItem("statsComparisonStat")
    const defaultStat = savedStat || "damage"
    setCurrentStat(defaultStat)
    onStatChange?.(defaultStat)
  }, [onStatChange])

  useEffect(() => {
    const newStat = selectedStat || "damage"
    setCurrentStat(newStat)
    localStorage.setItem("statsComparisonStat", newStat)
  }, [selectedStat])

  const handleStatChange = (newStat: string) => {
    setCurrentStat(newStat)
    localStorage.setItem("statsComparisonStat", newStat)
    onStatChange?.(newStat)
  }

  const maxValue = Math.max(...players.map((player) => getStatValue(player, currentStat)))
  const statOptions = [
    { value: "oro", label: "Oro ganado" },
    { value: "damage", label: "Daño a campeones" },
    { value: "healing", label: "Curación total" },
    { value: "tiempo_muerto", label: "Tiempo muerto" },
    { value: "minions", label: "Minions eliminados" },
    { value: "cc", label: "CC" },
    { value: "vision", label: "Visión" },
    { value: "pings", label: "Pings" },
  ]

  return (
    <Card className="glass-card border-white/15 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-white">Comparación de stats</CardTitle>
          <Select value={currentStat} onValueChange={handleStatChange}>
            <SelectTrigger className="w-52 border-white/20 bg-black/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/20 bg-slate-900/95">
              {statOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-white">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="flex h-64 items-end justify-center gap-3 px-2 md:px-4">
          {players.map((player, index) => {
            const value = getStatValue(player, currentStat)
            const heightPercentage = maxValue > 0 ? Math.min((value / maxValue) * 85, 85) : 10
            const isHighlighted = player.summoner_name === highlightedSummonerName
            const hasMvpScore = (player.mvp_score || 0) > 0

            let barColor = "bg-slate-500"
            if (hasMvpScore) barColor = isHighlighted ? "bg-cyan-300" : "bg-cyan-500"
            else if (player.team_id === 100) barColor = isHighlighted ? "bg-sky-300" : "bg-sky-500"
            else barColor = isHighlighted ? "bg-rose-300" : "bg-rose-500"

            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-2" style={{ maxWidth: "72px" }}>
                <div
                  className="group/bar relative flex h-48 w-full cursor-pointer items-end rounded border border-white/15 bg-black/20"
                  onClick={() => onPlayerClick?.(player.summoner_name || "")}
                >
                  <div
                    className={`relative min-h-[8px] w-full rounded-t transition-all duration-300 ${barColor} ${isHighlighted ? "ring-2 ring-white" : ""}`}
                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/95 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover/bar:opacity-100">
                      {formatTooltipValue(value, currentStat)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white">{formatTooltipValue(value, currentStat)}</div>
                <div className="h-8 w-8 overflow-hidden rounded border border-white/20 bg-black/20">
                  <img src={getChampionImageUrl(player.champion_name)} alt={player.champion_name} className="h-full w-full object-cover" />
                </div>
                <div className="w-full truncate text-center text-xs text-slate-300/70">{getPlayerName(player)}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
