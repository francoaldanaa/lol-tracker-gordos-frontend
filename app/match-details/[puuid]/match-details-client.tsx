"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Match, MatchPlayer, Team } from "@/lib/mongodb"
import MatchPlayers from "@/components/match-players"
import StatsComparison from "@/components/stats-comparison"
import ObjectiveChip from "@/components/objective-chip"
import SummonerStatsTooltip from "@/components/summoner-stats-tooltip"
import CircleSummonerAvatar from "@/components/circle-summoner-avatar"
import { useSummonerStats } from "@/hooks/use-summoner-stats"
import { formatDuration, formatMatchDate, getChampionImageUrl, getChampionNameById, getGameType } from "@/lib/game-utils"

function getObjectiveValue(team: Team | undefined, ...keys: string[]): number | boolean {
  if (!team) return 0
  const objectives = team.objectives as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = objectives[key]
    if (typeof value === "number" || typeof value === "boolean") return value
  }
  return 0
}

export default function MatchDetailsClient() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.puuid as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedSummonerName, setHighlightedSummonerName] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState("damage")
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredPlayer, setHoveredPlayer] = useState<MatchPlayer | null>(null)
  const { stats, loading: statsLoading, error: statsError, handleHoverStart, handleHoverEnd } = useSummonerStats()

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/matches?matchId=${matchId}`)
        if (!response.ok) throw new Error("Failed to fetch match")
        const data = await response.json()
        if (data.matches?.length) setMatch(data.matches[0] as Match)
        else setError("Partida no encontrada")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado")
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
    document.title = "Gordos Tracker - Detalles de Partida"
    const storedName = sessionStorage.getItem("highlightedSummonerName")
    if (storedName) {
      setHighlightedSummonerName(storedName)
      sessionStorage.removeItem("highlightedSummonerName")
    }
  }, [matchId])

  const handleTooltipChange = (position: { x: number; y: number } | null, player: MatchPlayer | null) => {
    setTooltipPosition(position)
    setHoveredPlayer(player)
    if (position && player) handleHoverStart(player.puuid, player.champion_name, player.position)
    else handleHoverEnd()
  }

  const handleProfileClick = (puuid: string, event: React.MouseEvent) => {
    event.stopPropagation()
    router.push(`/profile/${puuid}`)
  }

  const objectiveRows = useMemo(() => {
    if (!match) return []
    const trackedTeamId = match.players.find((player) => (player.mvp_score || 0) > 0)?.team_id
    const firstTeamId = trackedTeamId === 200 ? 200 : 100
    const secondTeamId = firstTeamId === 100 ? 200 : 100
    const firstTeam = match.teams.find((team) => team.teamId === firstTeamId)
    const secondTeam = match.teams.find((team) => team.teamId === secondTeamId)
    const firstKills = Number(getObjectiveValue(firstTeam, "champion_kills"))
    const secondKills = Number(getObjectiveValue(secondTeam, "champion_kills"))
    return [
      { label: "Asesinatos", left: firstKills, right: secondKills },
      { label: "Muertes", left: secondKills, right: firstKills },
      { label: "Torres", left: getObjectiveValue(firstTeam, "tower_kills"), right: getObjectiveValue(secondTeam, "tower_kills") },
      { label: "Inhibidores", left: getObjectiveValue(firstTeam, "inhibitor_kills"), right: getObjectiveValue(secondTeam, "inhibitor_kills") },
    ]
  }, [match])

  if (loading) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Cargando detalles de la partida...</div></div>
  if (error) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-rose-300">{error}</div></div>
  if (!match) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Partida no encontrada</div></div>

  const blueTeam = match.teams.find((team) => team.teamId === 100)
  const redTeam = match.teams.find((team) => team.teamId === 200)
  const winningTeamId = match.teams.find((team) => team.win)?.teamId
  const trackedTeamId = match.players.find((player) => (player.mvp_score || 0) > 0)?.team_id
  const firstTeamId = trackedTeamId === 200 ? 200 : 100
  const secondTeamId = firstTeamId === 100 ? 200 : 100
  const firstTeam = firstTeamId === 100 ? blueTeam : redTeam
  const secondTeam = secondTeamId === 100 ? blueTeam : redTeam
  const firstTeamLabel = firstTeamId === 100 ? "Equipo Azul" : "Equipo Rojo"
  const secondTeamLabel = secondTeamId === 100 ? "Equipo Azul" : "Equipo Rojo"
  const firstTeamValueClass = firstTeamId === 100 ? "text-cyan-100" : "text-rose-100"
  const secondTeamValueClass = secondTeamId === 100 ? "text-cyan-100" : "text-rose-100"
  const trackedWon = match.players.some((player) => (player.mvp_score || 0) > 0 && player.team_id === winningTeamId)

  const renderTeamCard = (teamId: 100 | 200) => {
    const isBlue = teamId === 100
    const teamPlayers = match.players.filter((player) => player.team_id === teamId)
    return (
      <Card key={`team-${teamId}`} className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className={isBlue ? "text-cyan-200" : "text-rose-200"}>
            {isBlue ? "Equipo Azul" : "Equipo Rojo"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MatchPlayers
            players={teamPlayers}
            onPlayerClick={(_, summonerName) => setHighlightedSummonerName(summonerName)}
            onProfileClick={handleProfileClick}
            matchId={match.match_id}
            showTeams={false}
            highlightedSummonerName={highlightedSummonerName}
            match={match}
            selectedStat={selectedStat}
            onStatChange={setSelectedStat}
            onTooltipChange={handleTooltipChange}
            showStatButtons={false}
          />
        </CardContent>
      </Card>
    )
  }

  const renderBans = (team: Team | undefined, teamColor: "blue" | "red") => {
    const bans = team?.bans || []

    if (bans.length === 0) {
      return <div className="flex justify-center"><div className="glass-chip">Sin datos de baneos</div></div>
    }

    return (
      <div className="flex flex-wrap justify-center gap-2">
        {bans.map((ban, index) => {
          const championId = ban.champion_id ?? ban.championId ?? -1
          const championName = getChampionNameById(championId)

          if (!championName) {
            return (
              <div key={`${teamColor}-ban-${index}`} className="glass-card flex h-20 w-20 items-center justify-center px-2 text-center text-xs text-slate-300/70">
                Sin baneo
              </div>
            )
          }

          return (
            <div key={`${teamColor}-ban-${index}`} className="glass-card flex w-20 flex-col items-center p-2">
              <div className="relative">
                <CircleSummonerAvatar
                  src={getChampionImageUrl(championName)}
                  alt={championName}
                  sizeClassName="h-10 w-10"
                />
                <div className="ban-mark-layer" />
                <div className="ban-mark-line" />
              </div>
              <span className="mt-1 line-clamp-2 text-center text-[10px] leading-tight text-slate-100">
                {championName}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="glass-shell p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="title-gradient text-3xl font-semibold">Detalle de partida</h1>
          <Badge className={`px-4 py-1.5 text-base font-bold ${trackedWon ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}`}>
            {trackedWon ? "VICTORIA" : "DERROTA"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="glass-chip">{getGameType(match.queue_id)}</span>
          <span className="glass-chip">Duración: {formatDuration(match.game_duration_seconds)}</span>
          <span className="glass-chip">{formatMatchDate(match.timestamp)}</span>
        </div>
      </section>

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-white">Control de objetivos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <ObjectiveChip
              type="voidgrubs"
              blue={Number(getObjectiveValue(firstTeam, "void_monster_kill", "voidgrub_kills", "voidgrubs_kills", "horde_kills"))}
              red={Number(getObjectiveValue(secondTeam, "void_monster_kill", "voidgrub_kills", "voidgrubs_kills", "horde_kills"))}
            />
            <ObjectiveChip type="dragones" blue={Number(getObjectiveValue(firstTeam, "dragon_kills"))} red={Number(getObjectiveValue(secondTeam, "dragon_kills"))} />
            <ObjectiveChip type="herald" blue={Number(getObjectiveValue(firstTeam, "riftHerald_kills", "rift_herald_kills"))} red={Number(getObjectiveValue(secondTeam, "riftHerald_kills", "rift_herald_kills"))} />
            <ObjectiveChip type="baron" blue={Number(getObjectiveValue(firstTeam, "baron_kills"))} red={Number(getObjectiveValue(secondTeam, "baron_kills"))} />
          </div>
          <div className="glass-card grid grid-cols-3 items-center p-2 text-xs uppercase tracking-[0.08em]">
            <span className={`font-semibold ${firstTeamValueClass}`}>{firstTeamLabel}</span>
            <span className="text-center text-slate-200/80">Objetivo</span>
            <span className={`text-right font-semibold ${secondTeamValueClass}`}>{secondTeamLabel}</span>
          </div>
          {objectiveRows.map((row) => (
            <div key={row.label} className="glass-card grid grid-cols-3 items-center p-2">
              <span className={firstTeamValueClass}>{String(row.left)}</span>
              <span className="text-center text-slate-200/80">{row.label}</span>
              <span className={`text-right ${secondTeamValueClass}`}>{String(row.right)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {renderTeamCard(firstTeamId as 100 | 200)}

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-white">Comparación de estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsComparison
            players={match.players}
            highlightedSummonerName={highlightedSummonerName}
            selectedStat={selectedStat}
            onStatChange={setSelectedStat}
            onPlayerClick={(summonerName) => setHighlightedSummonerName(summonerName)}
          />
        </CardContent>
      </Card>

      {renderTeamCard(secondTeamId as 100 | 200)}

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-white">Bans por equipo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="glass-card p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-cyan-200/80">Baneos azul</div>
            {renderBans(blueTeam, "blue")}
          </div>
          <div className="glass-card p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-rose-200/80">Baneos rojo</div>
            {renderBans(redTeam, "red")}
          </div>
        </CardContent>
      </Card>

      {tooltipPosition && hoveredPlayer && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y, transform: "translate(-50%, -100%)" }}
        >
          <SummonerStatsTooltip
            stats={stats}
            loading={statsLoading}
            error={statsError}
            championName={hoveredPlayer.champion_name}
            position={hoveredPlayer.position}
          />
        </div>
      )}
    </div>
  )
}

