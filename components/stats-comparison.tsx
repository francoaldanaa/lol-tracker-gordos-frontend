"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MatchPlayer } from "@/lib/mongodb"
import { getChampionImageUrl } from '@/lib/game-utils'

interface StatsComparisonProps {
  players: MatchPlayer[]
  highlightedSummonerName?: string | null
  selectedStat?: string
  onStatChange?: (stat: string) => void
  onPlayerClick?: (summonerName: string) => void
}

function getPlayerName(player: MatchPlayer): string {
  return player.summoner_name || player.riot_id_game_name || 'Desconocido'
}

function getStatValue(player: MatchPlayer, stat: string): number {
  switch (stat) {
    case 'oro':
      return player.gold_earned || 0
    case 'damage':
      return player.total_dmg_dealt_champions || 0
    case 'healing':
      return player.healing_done || 0
    case 'tiempo_muerto':
      return player.total_time_spent_dead || 0
    case 'minions':
      return player.total_minions_killed || 0
    case 'cc':
      return player.total_time_cc_dealt || 0
    case 'vision':
      return player.vision_score || 0
    case 'pings':
      return player.all_in_pings || 0
    default:
      return player.total_dmg_dealt_champions || 0
  }
}

function formatTooltipValue(value: number, stat: string): string {
  if (stat === 'tiempo_muerto' || stat === 'cc') {
    const minutes = Math.floor(value / 60)
    const seconds = value % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return value.toLocaleString()
}

export default function StatsComparison({ 
  players, 
  highlightedSummonerName,
  selectedStat = 'damage',
  onStatChange,
  onPlayerClick
}: StatsComparisonProps) {
  const [currentStat, setCurrentStat] = useState(selectedStat)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStat = localStorage.getItem('statsComparisonStat')
      if (savedStat) {
        setCurrentStat(savedStat)
        onStatChange?.(savedStat)
      } else {
        // Default to "damage" (Daño a campeones)
        setCurrentStat('damage')
        localStorage.setItem('statsComparisonStat', 'damage')
        onStatChange?.('damage')
      }
    }
  }, [])

  // Update currentStat when selectedStat prop changes (from external sources like clicking filterable stats)
  useEffect(() => {
    const newStat = selectedStat || 'damage'
    setCurrentStat(newStat)
    if (typeof window !== 'undefined') {
      localStorage.setItem('statsComparisonStat', newStat)
    }
  }, [selectedStat])

  const handleStatChange = (newStat: string) => {
    setCurrentStat(newStat)
    if (typeof window !== 'undefined') {
      localStorage.setItem('statsComparisonStat', newStat)
    }
    onStatChange?.(newStat)
  }

  // Get the maximum value for scaling
  const maxValue = Math.max(...players.map(player => getStatValue(player, currentStat)))
  
  const statOptions = [
    { value: 'oro', label: 'Oro ganado' },
    { value: 'damage', label: 'Daño a campeones' },
    { value: 'healing', label: 'Curación total' },
    { value: 'tiempo_muerto', label: 'Tiempo muerto' },
    { value: 'minions', label: 'Minions eliminados' },
    { value: 'cc', label: 'CC' },
    { value: 'vision', label: 'Visión' },
    { value: 'pings', label: 'Pings' }
  ]
  
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Comparación Stats</CardTitle>
          <Select value={currentStat} onValueChange={handleStatChange}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {statOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
       <CardContent className="pt-8">
        <div className="flex items-end justify-center gap-3 h-64 px-4">
          {players.map((player, index) => {
            const value = getStatValue(player, currentStat)
            // Ensure the highest bar doesn't reach 100% by capping at 85%
            const heightPercentage = maxValue > 0 ? Math.min((value / maxValue) * 85, 85) : 10
            const isHighlighted = player.summoner_name === highlightedSummonerName
            const hasMvpScore = player.mvp_score !== undefined && player.mvp_score > 0
            
            // Determine bar color
            let barColor = 'bg-gray-500' // default
            if (hasMvpScore) {
              barColor = isHighlighted ? 'bg-purple-400' : 'bg-purple-500'
            } else if (player.team_id === 100) {
              barColor = isHighlighted ? 'bg-blue-400' : 'bg-blue-500'
            } else {
              barColor = isHighlighted ? 'bg-red-400' : 'bg-red-500'
            }
            
            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1" style={{ maxWidth: 'calc(5rem - 8px)', marginLeft: index > 0 ? '4px' : '0', marginRight: '4px' }}>
                {/* Bar */}
                <div className="relative h-48 flex items-end bg-gray-800 rounded border border-gray-700 group/bar cursor-pointer" style={{ width: 'calc(100% - 8px)' }} onClick={() => onPlayerClick?.(player.summoner_name || '')}>
                  <div 
                    className={`w-full transition-all duration-300 rounded-t min-h-[8px] ${
                      barColor
                    } ${
                      isHighlighted ? 'ring-2 ring-white shadow-lg scale-105' : ''
                    } relative`}
                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      {formatTooltipValue(value, currentStat)}
                    </div>
                  </div>
                </div>
                
                {/* Value */}
                <div className="text-xs text-white font-medium">
                  {formatTooltipValue(value, currentStat)}
                </div>
                
                {/* Champion image */}
                <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative hover-tooltip-container">
                  <img
                    src={getChampionImageUrl(player.champion_name)}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `/placeholder.svg?height=32&width=32&text=${player.champion_name}`
                    }}
                    alt={player.champion_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Champion name tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none tooltip">
                    {player.champion_name}
                  </div>
                  <style jsx>{`
                    .hover-tooltip-container:hover .tooltip {
                      opacity: 1 !important;
                    }
                  `}</style>
                </div>
                
                {/* Player name */}
                <div className="text-xs text-gray-400 text-center w-full group/summoner relative">
                  <div className="truncate">
                    {getPlayerName(player)}
                  </div>
                  {/* Summoner name tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover/summoner:opacity-100 transition-opacity duration-200 whitespace-nowrap z-15 pointer-events-none">
                    {getPlayerName(player)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}