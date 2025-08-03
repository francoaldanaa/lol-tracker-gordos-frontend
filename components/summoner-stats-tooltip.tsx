"use client"

import React from 'react'

interface SummonerStats {
  championWinrate: number
  overallWinrate: number
  positionWinrate: number
  totalGames: number
  championGames: number
  positionGames: number
}

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label: string
  games?: number
}

// Function to get Spanish position display (same as match-details)
function getPositionDisplay(position: string): string {
  const normalized = position.toUpperCase()
  if (normalized === "MIDDLE") return "MID"
  if (normalized === "BOTTOM") return "ADC"
  if (normalized === "UTILITY") return "SUPPORT"
  return normalized
}

function CircularProgress({ percentage, size = 60, strokeWidth = 4, label, games }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Color based on winrate
  const getColor = (rate: number) => {
    if (rate >= 60) return '#10b981' // green
    if (rate >= 50) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const color = getColor(percentage)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      {/* Label */}
      <div className="text-center">
        <div className="text-xs text-gray-300 font-medium">{label}</div>
        {games !== undefined && (
          <div className="text-xs text-gray-500">{games} games</div>
        )}
      </div>
    </div>
  )
}

interface SummonerStatsTooltipProps {
  stats: SummonerStats | null
  loading: boolean
  error: string | null
  championName: string
  position: string
}

export default function SummonerStatsTooltip({ 
  stats, 
  loading, 
  error, 
  championName, 
  position 
}: SummonerStatsTooltipProps) {
  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <div className="text-red-400 text-sm">Error cargando estadísticas</div>
      </div>
    )
  }

  if (loading || !stats) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <div className="text-gray-300 text-sm">Cargando estadísticas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg min-w-[280px]">
      <div className="text-white text-sm font-semibold mb-3 text-center">
        Winrate (Últimos 15 Días)
      </div>
      
      <div className="flex justify-around items-start gap-4">
        <CircularProgress
          percentage={stats.championWinrate}
          label={championName}
          games={stats.championGames}
        />
        
        <CircularProgress
          percentage={stats.overallWinrate}
          label="General"
          games={stats.totalGames}
        />
        
        <CircularProgress
          percentage={stats.positionWinrate}
          label={getPositionDisplay(position)}
          games={stats.positionGames}
        />
      </div>
      
      {stats.totalGames === 0 && (
        <div className="text-center text-gray-400 text-xs mt-2">
          No se encontraron partidas en los últimos 15 días
        </div>
      )}
    </div>
  )
}