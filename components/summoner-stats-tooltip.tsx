"use client"

import { getPositionDisplay, formatNumber } from "@/lib/game-utils"

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

function CircularProgress({ percentage, size = 60, strokeWidth = 4, label, games }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = (rate: number) => {
    if (rate >= 60) return "#34d399"
    if (rate >= 50) return "#fbbf24"
    return "#fb7185"
  }

  const color = getColor(percentage)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#334155" strokeWidth={strokeWidth} fill="transparent" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{formatNumber(percentage)}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-slate-200">{label}</div>
        {games !== undefined ? <div className="text-xs text-slate-300/60">{games} games</div> : null}
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

export default function SummonerStatsTooltip({ stats, loading, error, championName, position }: SummonerStatsTooltipProps) {
  if (error) {
    return <div className="glass-card rounded-xl border-white/20 p-3 text-sm text-rose-300">Error cargando estadísticas</div>
  }

  if (loading || !stats) {
    return (
      <div className="glass-card flex items-center gap-2 rounded-xl border-white/20 p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-cyan-400" />
        <div className="text-sm text-slate-200/80">Cargando estadísticas...</div>
      </div>
    )
  }

  return (
    <div className="glass-card min-w-[280px] rounded-xl border-white/20 p-4 shadow-lg">
      <div className="mb-3 text-center text-sm font-semibold text-white">Winrate (últimos 15 días)</div>
      <div className="flex items-start justify-around gap-4">
        <CircularProgress percentage={stats.championWinrate} label={championName} games={stats.championGames} />
        <CircularProgress percentage={stats.overallWinrate} label="General" games={stats.totalGames} />
        <CircularProgress percentage={stats.positionWinrate} label={getPositionDisplay(position)} games={stats.positionGames} />
      </div>
      {stats.totalGames === 0 ? <div className="mt-2 text-center text-xs text-slate-300/70">No se encontraron partidas recientes</div> : null}
    </div>
  )
}
