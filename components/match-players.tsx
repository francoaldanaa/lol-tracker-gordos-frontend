"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { MatchPlayer } from "@/lib/mongodb"
import { useSummonerStats } from "@/hooks/use-summoner-stats"
import SummonerStatsTooltip from "@/components/summoner-stats-tooltip"
import { getPositionColor, getPositionDisplay, formatGold, formatDamage, formatNumber, getChampionImageUrl, getItemImageUrl } from '@/lib/game-utils'

interface MatchPlayersProps {
  players: MatchPlayer[]
  showOnlyMvp?: boolean
  onPlayerClick?: (matchId: string, summonerName: string) => void
  onProfileClick?: (puuid: string, event: React.MouseEvent) => void
  matchId?: string
  showTeams?: boolean
  highlightedSummonerName?: string | null
  match?: { game_duration_seconds: number; queue_id: number }
  selectedStat?: string
  onStatChange?: (stat: string) => void
  onTooltipChange?: (position: { x: number; y: number } | null, player: MatchPlayer | null) => void
}

function getPlayerName(player: MatchPlayer): string {
  return player.summoner_name || player.riot_id_game_name || 'Desconocido'
}

// Utility functions moved to @/lib/game-utils

// Map stat labels to their corresponding filter values
const filterableStats = {
  'Oro Ganado': 'oro',
  'Oro ganado': 'oro',
  'Daño Total': 'damage',
  'Daño total': 'damage',
  'Curación Total': 'healing',
  'Curación total': 'healing',
  'Tiempo Muerto': 'tiempo_muerto',
  'Tiempo muerto': 'tiempo_muerto',
  'Minions Eliminados': 'minions',
  'Minions eliminados': 'minions',
  'CC Aplicado': 'cc',
  'CC aplicado': 'cc',
  'Puntuación de Visión': 'vision',
  'Puntuación de visión': 'vision'
}

function isFilterableStat(label: string): boolean {
  return label in filterableStats
}

function getStatKey(label: string): string | undefined {
  return filterableStats[label as keyof typeof filterableStats]
}

// Helper component for rendering stat rows
function StatRow({ label, value, selectedStat, onStatChange }: {
  label: string
  value: string
  selectedStat?: string
  onStatChange?: (stat: string) => void
}) {
  const isFilterable = isFilterableStat(label)
  const statKey = getStatKey(label)
  const isSelected = statKey === selectedStat
  
  const handleClick = () => {
    if (isFilterable && statKey && onStatChange) {
      // Always set the filter to this stat when clicked, no toggle functionality
      onStatChange(statKey)
    }
  }
  
  const labelClasses = isFilterable 
    ? isSelected 
      ? 'text-blue-400 cursor-pointer hover:text-blue-300 font-semibold'
      : 'text-gray-300 cursor-pointer hover:text-white'
    : 'text-gray-400'
    
  const valueClasses = isFilterable 
    ? isSelected 
      ? 'text-blue-400 cursor-pointer hover:text-blue-300 font-semibold'
      : 'text-gray-100 cursor-pointer hover:text-white'
    : 'text-white'
  
  return (
    <div className="flex justify-between">
      <span className={labelClasses} onClick={handleClick}>{label}:</span>
      <span className={valueClasses} onClick={handleClick}>{value}</span>
    </div>
  )
}

export default function MatchPlayers({ 
  players, 
  showOnlyMvp = false, 
  onPlayerClick, 
  onProfileClick,
  matchId,
  showTeams = false,
  highlightedSummonerName,
  match,
  selectedStat = 'damage',
  onStatChange,
  onTooltipChange
}: MatchPlayersProps) {
  const { stats, loading, error, handleHoverStart, handleHoverEnd } = useSummonerStats()
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<MatchPlayer | null>(null)
  // Filter players if showOnlyMvp is true
  const displayPlayers = showOnlyMvp 
    ? players.filter(player => 
        player.mvp_score !== undefined && 
        player.mvp_score !== null && 
        player.mvp_score > 0
      )
    : players

  // Group players by team if showTeams is true
  const team1Players = showTeams ? displayPlayers.filter(p => p.team_id === 100) : []
  const team2Players = showTeams ? displayPlayers.filter(p => p.team_id === 200) : []

  const handlePlayerClick = (player: MatchPlayer) => {
    if (onPlayerClick && matchId && player.mvp_score !== undefined && player.mvp_score > 0) {
      // Toggle functionality: if this player is already highlighted, unhighlight them
      const summonerName = player.summoner_name || ''
      if (highlightedSummonerName === summonerName) {
        onPlayerClick(matchId, '') // Clear highlight by passing empty string
      } else {
        onPlayerClick(matchId, summonerName) // Set highlight
      }
    }
  }

  const handleSummonerHover = (player: MatchPlayer, event: React.MouseEvent) => {
    // Only show tooltip for players with mvp_score
    if (player.mvp_score === undefined || player.mvp_score === null || player.mvp_score <= 0) {
      return
    }
    
    // Only show tooltip for specific game types: Normal Draft (400), Ranked Solo (420), Ranked Flex (440)
    if (match?.queue_id && ![400, 420, 440].includes(match.queue_id)) {
      return
    }
    
    // Don't show tooltip if position is empty (common in non-ranked games)
    if (!player.position || player.position.trim() === '') {
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    }
    setTooltipPosition(position)
    setHoveredPlayer(player)
    onTooltipChange?.(position, player)
    handleHoverStart(player.puuid, player.champion_name, player.position)
  }

  const handleSummonerLeave = () => {
    // Only clear if tooltip was actually shown
    if (tooltipPosition) {
      setTooltipPosition(null)
      setHoveredPlayer(null)
      onTooltipChange?.(null, null)
      handleHoverEnd()
    }
  }

  if (showTeams) {
    // Calculate highest MVP score for star badge
    const highestMvpScore = Math.max(...displayPlayers.map(p => p.mvp_score ?? 0))
    
    return (
      <div className="space-y-4">
        {/* Team 1 (Blue) */}
        <div>
          <h3 className="text-blue-400 font-semibold mb-2">Equipo Azul</h3>
          <div className="space-y-1">
            {team1Players.map((player, index) => (
              <div key={index}>
                <div
                  className={`flex items-center p-2 ${player.summoner_name === highlightedSummonerName ? 'bg-gray-800 rounded-t-lg' : 'bg-gray-800/50 rounded-lg'} ${
                    onPlayerClick && player.mvp_score !== undefined && player.mvp_score > 0 ? 'hover:bg-gray-800 transition-colors cursor-pointer' : ''
                  }`}
                  onClick={() => handlePlayerClick(player)}
                >
                {/* Left section - 30% width */}
                <div className="w-[30%] flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={getChampionImageUrl(player.champion_name)}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = `/placeholder.svg?height=40&width=40&text=${player.champion_name}`
                      }}
                      alt={player.champion_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick && (
                        <span 
                          className="text-blue-400 cursor-pointer hover:text-blue-300" 
                          onClick={(e) => onProfileClick(player.puuid, e)}
                        >
                          👤
                        </span>
                      )}
                      <span 
                        className={`font-medium truncate ${player.mvp_score !== undefined && player.mvp_score > 0 ? 'text-white cursor-pointer hover:underline' : 'text-gray-500'}`}
                        onClick={player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick ? (e) => onProfileClick(player.puuid, e) : undefined}
                        onMouseEnter={(e) => handleSummonerHover(player, e)}
                        onMouseLeave={handleSummonerLeave}
                      >
                        {getPlayerName(player)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 text-sm truncate">{player.champion_name}</div>
                      <span className={`text-xs font-medium uppercase ${getPositionColor(player.position)}`}>
                        {getPositionDisplay(player.position)}
                      </span>
                      {player.mvp_score !== undefined && player.mvp_score > 0 && (
                        <span className="text-purple-400 text-xs font-medium">
                          MVP Score: {formatNumber(player.mvp_score, 2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle section - Items */}
                <div className="flex items-center gap-1 ml-4">
                  {[player.item_0, player.item_1, player.item_2, player.item_3, player.item_4, player.item_5].map((itemId, itemIndex) => (
                    <div key={itemIndex} className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                      {itemId && itemId > 0 ? (
                        <img
                          src={getItemImageUrl(itemId)}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = `/placeholder.svg?height=32&width=32&text=${itemId}`
                          }}
                          alt={`Item ${itemId}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right section - Stats */}
                <div className="flex items-center gap-6 ml-auto">
                  {/* Star MVP Badge - positioned before KDA */}
                  {player.mvp_score === highestMvpScore && player.mvp_score !== undefined && player.mvp_score > 0 && (
                    <div className="flex items-center mr-4">
                      <Badge className="bg-yellow-500 text-black text-sm font-bold px-3 py-1 h-7">
                        ⭐ MVP
                      </Badge>
                    </div>
                  )}
                 <div className="flex items-center gap-1 text-sm">
                   <span className="text-green-400 font-bold">{player.kills}</span>
                   <span className="text-gray-400">/</span>
                   <span className="text-red-400 font-bold">{player.deaths}</span>
                   <span className="text-gray-400">/</span>
                   <span className="text-yellow-400 font-bold">{player.assists}</span>
                 </div>

                 <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">💰</span>
                      <span>{formatGold(player.gold_earned)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-red-500">⚔️</span>
                      <span>{formatDamage(player.total_dmg_dealt_champions)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400">👁️</span>
                      <span>{player.vision_score}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-400">💚</span>
                      <span>{formatDamage(player.healing_done)}</span>
                    </div>
                  </div>
               </div>
                </div>
                
                {/* Expanded section when highlighted */}
                {player.summoner_name === highlightedSummonerName && (
                  <div className="p-4 bg-gray-800 rounded-b-lg border-l-4 border-blue-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Multi-kills section */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Multi-kills</h4>
                        <div className="space-y-1">
                          {player.quadra_kills > 0 && (
                            <Badge className="bg-orange-600 text-white mr-2">
                              QUADRA💀 x{player.quadra_kills}
                            </Badge>
                          )}
                          {player.penta_kills > 0 && (
                            <Badge className="bg-red-600 text-white">
                              PENTA5💀 x{player.penta_kills}
                            </Badge>
                          )}
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Mayor Multi Kill:</span>
                              <span className="text-white">{player.largest_multi_kill}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Combat Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de Combate</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Oro Ganado" 
                            value={`${formatNumber(player.gold_earned / 1000, 3)}💰 (${Math.round(player.gold_earned / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Daño Total" 
                            value={`${formatNumber(player.total_dmg_dealt_champions / 1000, 3)}⚔️`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Curación Total" 
                            value={`${formatNumber(player.healing_done / 1000, 3)}💚`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Tiempo Muerto" 
                            value={`${Math.floor(player.total_time_spent_dead / 60)}m ${player.total_time_spent_dead % 60}s (${formatNumber((player.total_time_spent_dead / (match?.game_duration_seconds || 1)) * 100)}%)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Minions Eliminados" 
                            value={`${player.total_minions_killed}🐛 (${formatNumber(player.total_minions_killed / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="CC Aplicado" 
                            value={`${Math.floor(player.total_time_cc_dealt / 60)}m ${player.total_time_cc_dealt % 60}s`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Mayor Tiempo Vivo:</span>
                            <span className="text-white">{Math.floor(player.longest_time_spent_living / 60)}m {player.longest_time_spent_living % 60}s</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vision Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de Visión</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Puntuación de Visión" 
                            value={`${player.vision_score}`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Destruidos:</span>
                            <span className="text-white">{player.wards_killed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Colocados:</span>
                            <span className="text-white">{player.wards_placed}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 (Red) */}
        <div>
          <h3 className="text-red-400 font-semibold mb-2">Equipo Rojo</h3>
          <div className="space-y-1">
            {team2Players.map((player, index) => (
              <div key={index}>
                <div
                  className={`flex items-center p-2 ${player.summoner_name === highlightedSummonerName ? 'bg-gray-800 rounded-t-lg' : 'bg-gray-800/50 rounded-lg'} ${
                    onPlayerClick && player.mvp_score !== undefined && player.mvp_score > 0 ? 'hover:bg-gray-800 transition-colors cursor-pointer' : ''
                  }`}
                  onClick={() => handlePlayerClick(player)}
                >
                {/* Left section - 30% width */}
                <div className="w-[30%] flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={getChampionImageUrl(player.champion_name)}
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = `/placeholder.svg?height=40&width=40&text=${player.champion_name}`
                      }}
                      alt={player.champion_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick && (
                        <span 
                          className="text-blue-400 cursor-pointer hover:text-blue-300" 
                          onClick={(e) => onProfileClick(player.puuid, e)}
                        >
                          👤
                        </span>
                      )}
                      <span 
                        className={`font-medium truncate ${player.mvp_score !== undefined && player.mvp_score > 0 ? 'text-white cursor-pointer hover:underline' : 'text-gray-500'}`}
                        onClick={player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick ? (e) => onProfileClick(player.puuid, e) : undefined}
                        onMouseEnter={(e) => handleSummonerHover(player, e)}
                        onMouseLeave={handleSummonerLeave}
                      >
                        {getPlayerName(player)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 text-sm truncate">{player.champion_name}</div>
                      <span className={`text-xs font-medium uppercase ${getPositionColor(player.position)}`}>
                        {getPositionDisplay(player.position)}
                      </span>
                      {player.mvp_score !== undefined && player.mvp_score > 0 && (
                        <span className="text-purple-400 text-xs font-medium">
                          MVP Score: {formatNumber(player.mvp_score, 2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle section - Items */}
                <div className="flex items-center gap-1 ml-4">
                  {[player.item_0, player.item_1, player.item_2, player.item_3, player.item_4, player.item_5].map((itemId, itemIndex) => (
                    <div key={itemIndex} className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                      {itemId && itemId > 0 ? (
                        <img
                          src={getItemImageUrl(itemId)}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = `/placeholder.svg?height=32&width=32&text=${itemId}`
                          }}
                          alt={`Item ${itemId}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right section - Stats */}
                <div className="flex items-center gap-6 ml-auto">
                  {/* Star MVP Badge - positioned before KDA */}
                  {player.mvp_score === highestMvpScore && player.mvp_score !== undefined && player.mvp_score > 0 && (
                    <div className="flex items-center mr-4">
                      <Badge className="bg-yellow-500 text-black text-sm font-bold px-3 py-1 h-7">
                        ⭐ MVP
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-green-400 font-bold">{player.kills}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-red-400 font-bold">{player.deaths}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-yellow-400 font-bold">{player.assists}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">💰</span>
                      <span>{formatGold(player.gold_earned)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-red-500">⚔️</span>
                      <span>{formatDamage(player.total_dmg_dealt_champions)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400">👁️</span>
                      <span>{player.vision_score}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-400">💚</span>
                      <span>{formatDamage(player.healing_done)}</span>
                    </div>
                  </div>
                </div>
                </div>
                
                {/* Expanded section when highlighted */}
                {player.summoner_name === highlightedSummonerName && (
                  <div className="p-4 bg-gray-800 rounded-b-lg border-l-4 border-red-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Multi-kills section */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Multi-kills</h4>
                        <div className="space-y-1">
                          {player.quadra_kills > 0 && (
                            <Badge className="bg-orange-600 text-white mr-2">
                              STARS 4💀 x{player.quadra_kills}
                            </Badge>
                          )}
                          {player.penta_kills > 0 && (
                            <Badge className="bg-red-600 text-white">
                              STARS 5💀 x{player.penta_kills}
                            </Badge>
                          )}
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Mayor Multi Kill:</span>
                              <span className="text-white">{player.largest_multi_kill}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Combat Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de combate</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Oro ganado" 
                            value={`${formatNumber(player.gold_earned / 1000, 3)}💰 (${Math.round(player.gold_earned / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Daño total" 
                            value={`${formatNumber(player.total_dmg_dealt_champions / 1000, 3)}⚔️`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Curación total" 
                            value={`${formatNumber(player.healing_done / 1000, 3)}💚`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Tiempo muerto" 
                            value={`${Math.floor(player.total_time_spent_dead / 60)}m ${player.total_time_spent_dead % 60}s (${formatNumber((player.total_time_spent_dead / (match?.game_duration_seconds || 1)) * 100)}%)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Minions eliminados" 
                            value={`${player.total_minions_killed}🐛 (${formatNumber(player.total_minions_killed / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="CC aplicado" 
                            value={`${Math.floor(player.total_time_cc_dealt / 60)}m ${player.total_time_cc_dealt % 60}s`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Mayor tiempo vivo:</span>
                            <span className="text-white">{Math.floor(player.longest_time_spent_living / 60)}m {player.longest_time_spent_living % 60}s</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vision Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de Visión</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Puntuación de Visión" 
                            value={`${player.vision_score}`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Destruidos:</span>
                            <span className="text-white">{player.wards_killed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Colocados:</span>
                            <span className="text-white">{player.wards_placed}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        

      </div>
    )
  }

  // Single list view (for match-history)
  return (
    <div className="space-y-1">
      {displayPlayers.length > 0 ? (
        displayPlayers.map((player, index) => {
          const highestMvpScore = Math.max(...displayPlayers.map(p => p.mvp_score ?? 0))
          
          return (
            <div key={index}>
              <div
                className={`flex items-center p-2 ${player.summoner_name === highlightedSummonerName ? 'bg-gray-800 rounded-t-lg' : 'bg-gray-800/50 rounded-lg'} ${
                  onPlayerClick && player.mvp_score !== undefined && player.mvp_score > 0 ? 'hover:bg-gray-800 transition-colors cursor-pointer' : ''
                }`}
                onClick={() => handlePlayerClick(player)}
              >
              {/* Left section - 30% width */}
              <div className="w-[30%] flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src={getChampionImageUrl(player.champion_name)}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `/placeholder.svg?height=40&width=40&text=${player.champion_name}`
                    }}
                    alt={player.champion_name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     {player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick && (
                       <span 
                         className="text-blue-400 cursor-pointer hover:text-blue-300" 
                         onClick={(e) => onProfileClick(player.puuid, e)}
                       >
                         👤
                       </span>
                     )}
                     <span 
                       className={`font-medium truncate ${player.mvp_score !== undefined && player.mvp_score > 0 ? 'text-white cursor-pointer hover:underline' : 'text-gray-500'}`}
                       onClick={player.mvp_score !== undefined && player.mvp_score > 0 && onProfileClick ? (e) => onProfileClick(player.puuid, e) : undefined}
                       onMouseEnter={(e) => handleSummonerHover(player, e)}
                       onMouseLeave={handleSummonerLeave}
                     >
                       {getPlayerName(player)}
                     </span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="text-gray-400 text-sm truncate">{player.champion_name}</div>
                     <span className={`text-xs font-medium uppercase ${getPositionColor(player.position)}`}>
                       {getPositionDisplay(player.position)}
                     </span>
                     {player.mvp_score !== undefined && player.mvp_score > 0 && (
                        <span className="text-purple-400 text-xs font-medium">
                          MVP Score: {formatNumber(player.mvp_score, 2)}
                        </span>
                      )}
                   </div>
                 </div>
              </div>

              {/* Middle section - Items */}
              <div className="flex items-center gap-1 ml-4">
                {[player.item_0, player.item_1, player.item_2, player.item_3, player.item_4, player.item_5].map((itemId, itemIndex) => (
                  <div key={itemIndex} className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                    {itemId && itemId > 0 ? (
                      <img
                        src={getItemImageUrl(itemId)}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `/placeholder.svg?height=32&width=32&text=${itemId}`
                        }}
                        alt={`Item ${itemId}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-600"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Right section - Stats */}
               <div className="flex items-center gap-6 ml-auto">
                 {/* Star MVP Badge - positioned before KDA */}
                 {player.mvp_score === highestMvpScore && player.mvp_score !== undefined && player.mvp_score > 0 && (
                   <div className="flex items-center mr-4">
                     <Badge className="bg-yellow-500 text-black text-sm font-bold px-3 py-1 h-7">
                       ⭐ MVP
                     </Badge>
                   </div>
                 )}
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-green-400 font-bold">{player.kills}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-red-400 font-bold">{player.deaths}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-yellow-400 font-bold">{player.assists}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400">
                   <div className="flex items-center gap-1">
                     <span className="text-yellow-500">💰</span>
                     <span>{formatGold(player.gold_earned)}</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="text-red-500">⚔️</span>
                     <span>{formatDamage(player.total_dmg_dealt_champions)}</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="text-blue-400">👁️</span>
                     <span>{player.vision_score}</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="text-green-400">💚</span>
                     <span>{formatDamage(player.healing_done)}</span>
                   </div>
                 </div>
              </div>
               </div>
               
               {/* Expanded section when highlighted */}
                {player.summoner_name === highlightedSummonerName && (
                  <div className="p-4 bg-gray-800 rounded-b-lg border-l-4 border-purple-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Multi-kills section */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Multi-kills</h4>
                        <div className="space-y-1">
                          {player.quadra_kills > 0 && (
                            <Badge className="bg-orange-600 text-white mr-2">
                              STARS 4💀 x{player.quadra_kills}
                            </Badge>
                          )}
                          {player.penta_kills > 0 && (
                            <Badge className="bg-red-600 text-white">
                              STARS 5💀 x{player.penta_kills}
                            </Badge>
                          )}
                          <div className="mt-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Mayor Multi Kill:</span>
                              <span className="text-white">{player.largest_multi_kill}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Combat Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de Combate</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Oro Ganado" 
                            value={`${formatNumber(player.gold_earned / 1000, 3)}💰 (${Math.round(player.gold_earned / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Daño Total" 
                            value={`${formatNumber(player.total_dmg_dealt_champions / 1000, 3)}⚔️`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Curación Total" 
                            value={`${formatNumber(player.healing_done / 1000, 3)}💚`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Tiempo Muerto" 
                            value={`${Math.floor(player.total_time_spent_dead / 60)}m ${player.total_time_spent_dead % 60}s (${formatNumber((player.total_time_spent_dead / (match?.game_duration_seconds || 1)) * 100)}%)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="Minions Eliminados" 
                            value={`${player.total_minions_killed}🐛 (${formatNumber(player.total_minions_killed / ((match?.game_duration_seconds || 1) / 60))}/m)`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <StatRow 
                            label="CC Aplicado" 
                            value={`${Math.floor(player.total_time_cc_dealt / 60)}m ${player.total_time_cc_dealt % 60}s`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Mayor Tiempo Vivo:</span>
                            <span className="text-white">{Math.floor(player.longest_time_spent_living / 60)}m {player.longest_time_spent_living % 60}s</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vision Stats */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Estadísticas de Visión</h4>
                        <div className="space-y-1 text-sm">
                          <StatRow 
                            label="Puntuación de Visión" 
                            value={`${player.vision_score}`}
                            selectedStat={selectedStat}
                            onStatChange={onStatChange}
                          />
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Destruidos:</span>
                            <span className="text-white">{player.wards_killed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wards Colocados:</span>
                            <span className="text-white">{player.wards_placed}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )
        })
      ) : (
        <div className="text-center py-8 text-gray-400">
          {showOnlyMvp 
            ? "No players with MVP scores found in this match."
            : "No players found in this match."
          }
        </div>
      )}

    </div>
  )
}