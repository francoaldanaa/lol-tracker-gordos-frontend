"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { MatchPlayer } from "@/lib/mongodb"
import {
  calculateKDA,
  formatDamage,
  formatGold,
  formatNumber,
  getChampionImageUrl,
  getItemImageUrl,
  getPositionColor,
  getPositionDisplay,
} from "@/lib/game-utils"

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
  return player.summoner_name || player.riot_id_game_name || "Desconocido"
}

function readNumber(player: MatchPlayer, ...fields: string[]): number {
  const unknownPlayer = player as unknown as Record<string, unknown>
  for (const field of fields) {
    const value = unknownPlayer[field]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }
  return 0
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
}

export default function MatchPlayers({
  players,
  showOnlyMvp = false,
  onPlayerClick,
  onProfileClick,
  matchId,
  highlightedSummonerName,
  match,
  selectedStat,
  onStatChange,
  onTooltipChange,
}: MatchPlayersProps) {
  const displayPlayers = useMemo(() => {
    const base = showOnlyMvp ? players.filter((player) => (player.mvp_score || 0) > 0) : players
    return [...base].sort((a, b) => (b.mvp_score || 0) - (a.mvp_score || 0))
  }, [players, showOnlyMvp])

  const highestMvpScore = useMemo(() => {
    if (!displayPlayers.length) return 0
    return Math.max(...displayPlayers.map((player) => player.mvp_score || 0))
  }, [displayPlayers])

  const handleTooltipEnter = (event: React.MouseEvent, player: MatchPlayer) => {
    if (!onTooltipChange) return
    if (!player.position || player.position.trim() === "") return
    const rect = event.currentTarget.getBoundingClientRect()
    onTooltipChange(
      {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
      player
    )
  }

  const handleTooltipLeave = () => {
    onTooltipChange?.(null, null)
  }

  if (!displayPlayers.length) {
    return (
      <div className="glass-card px-4 py-8 text-center text-sm text-slate-300/80">
        {showOnlyMvp ? "No hay jugadores con MVP en esta partida." : "No hay jugadores para mostrar."}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayPlayers.map((player) => {
        const isHighlighted = highlightedSummonerName === player.summoner_name
        const isMvp = (player.mvp_score || 0) > 0
        const kda = calculateKDA(player.kills, player.deaths, player.assists)
        const totalDamageTaken = readNumber(player, "total_damage_taken", "totalDamageTaken")
        const damageToObjectives = readNumber(player, "damage_dealt_to_objectives", "damageDealtToObjectives")
        const controlWards = readNumber(player, "control_wards_placed", "controlWardsPlaced")
        const turretTakedowns = readNumber(player, "turret_takedowns", "turretTakedowns")
        const neutralMinionsKilled = readNumber(player, "neutral_minions_killed", "neutralMinionsKilled")
        const damageSelfMitigated = readNumber(player, "damage_self_mitigated", "damageSelfMitigated")
        const killParticipation = readNumber(player, "kill_participation", "killParticipation")
        const largestKillingSpree = readNumber(player, "largest_killing_spree", "largestKillingSpree")

        const totalPings =
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

        return (
          <div
            key={`${player.match_id}-${player.puuid}-${player.champion_name}`}
            className={`glass-shell p-4 transition-all duration-200 ${
              isHighlighted ? "ring-2 ring-cyan-300/70" : "hover:ring-1 hover:ring-white/20"
            }`}
            onClick={() => {
              if (!onPlayerClick || !matchId || !isMvp) return
              onPlayerClick(matchId, getPlayerName(player))
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(260px,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-black/20">
                  <img
                    src={getChampionImageUrl(player.champion_name)}
                    alt={player.champion_name}
                    className="block h-full w-full scale-110 object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      className={`truncate text-left font-semibold ${isMvp ? "text-white" : "text-slate-300"}`}
                      onClick={(event) => {
                        if (!onProfileClick || !isMvp) return
                        onProfileClick(player.puuid, event)
                      }}
                      onMouseEnter={(event) => handleTooltipEnter(event, player)}
                      onMouseLeave={handleTooltipLeave}
                    >
                      {getPlayerName(player)}
                    </button>
                  </div>
                  <div className="text-xs text-slate-300/75">
                    <span className={`mr-1 font-semibold ${getPositionColor(player.position)}`}>
                      {getPositionDisplay(player.position)}
                    </span>
                    <span>{player.champion_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto lg:justify-start">
                {[player.item_0, player.item_1, player.item_2, player.item_3, player.item_4, player.item_5].map((itemId, index) => (
                  <div key={`${player.puuid}-${index}`} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/30">
                    {itemId > 0 ? (
                      <img src={getItemImageUrl(itemId)} alt={`item-${itemId}`} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                ))}
                <div className="ml-1 h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-cyan-300/30 bg-cyan-900/20">
                  {player.item_6 > 0 ? (
                    <img src={getItemImageUrl(player.item_6)} alt={`item-${player.item_6}`} className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-right md:grid-cols-4 lg:justify-self-end">
                <div>
                  <div className="text-xs text-slate-300/70">K / D / A</div>
                  <div className="text-sm font-semibold text-white">
                    {player.kills}/{player.deaths}/{player.assists}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-300/70">KDA</div>
                  <div className="text-sm font-semibold text-cyan-200">{formatNumber(kda, 2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-300/70">Daño</div>
                  <div className="text-sm font-semibold text-orange-200">{formatDamage(player.total_dmg_dealt_champions)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-300/70">Gold</div>
                  <div className="text-sm font-semibold text-amber-200">{formatGold(player.gold_earned)}</div>
                </div>
              </div>

              <div className="min-w-[120px] lg:justify-self-end">
                {player.mvp_score > 0 ? (
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="border-cyan-300/35 bg-cyan-200/10 text-cyan-100">
                      Score {formatNumber(player.mvp_score, 2)}
                    </Badge>
                    {isMvp && player.mvp_score === highestMvpScore ? (
                      <Badge className="bg-amber-300/90 px-2 text-xs font-semibold text-slate-900">MVP</Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {isHighlighted && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-card p-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300/70">Combate</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300/70">Daño total</span><span>{formatDamage(player.total_dmg_dealt)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Daño recibido</span><span>{formatDamage(totalDamageTaken)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Mitigado</span><span>{formatDamage(damageSelfMitigated)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Racha maxima</span><span>{largestKillingSpree}</span></div>
                  </div>
                </div>

                <div className="glass-card p-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300/70">Objetivos</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300/70">Daño objetivos</span><span>{formatDamage(damageToObjectives)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Torres</span><span>{turretTakedowns}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Objetivos robados</span><span>{player.objectives_stolen}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">KP</span><span>{killParticipation ? `${formatNumber(killParticipation * 100)}%` : "-"}</span></div>
                  </div>
                </div>

                <div className="glass-card p-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300/70">Visión y macro</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300/70">Visión score</span><span>{player.vision_score}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Wards</span><span>{player.wards_placed}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Control wards</span><span>{controlWards}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">CS jungle</span><span>{neutralMinionsKilled}</span></div>
                  </div>
                </div>

                <div className="glass-card p-3">
                  <div className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300/70">Ritmo y comunicaciones</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-300/70">Pings totales</span><span>{totalPings}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Tiempo muerto</span><span>{formatSeconds(player.total_time_spent_dead)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">CC aplicado</span><span>{formatSeconds(player.total_time_cc_dealt)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300/70">Mayor tiempo vivo</span><span>{formatSeconds(player.longest_time_spent_living)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {isHighlighted && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="glass-chip">Nivel {player.champion_level}</span>
                <span className="glass-chip">
                  Multi-kill max: {player.largest_multi_kill} {player.penta_kills > 0 ? `(Penta x${player.penta_kills})` : ""}
                </span>
                <button
                  className={`glass-chip border-cyan-300/35 ${selectedStat === "damage" ? "bg-cyan-200/25 text-cyan-100" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onStatChange?.("damage")
                  }}
                >
                  Resaltar dano
                </button>
                <button
                  className={`glass-chip border-cyan-300/35 ${selectedStat === "oro" ? "bg-cyan-200/25 text-cyan-100" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onStatChange?.("oro")
                  }}
                >
                  Resaltar oro
                </button>
                <button
                  className={`glass-chip border-cyan-300/35 ${selectedStat === "vision" ? "bg-cyan-200/25 text-cyan-100" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onStatChange?.("vision")
                  }}
                >
                  Resaltar vision
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
