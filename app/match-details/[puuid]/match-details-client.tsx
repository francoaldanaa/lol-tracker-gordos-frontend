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
import { useSummonerStats } from "@/hooks/use-summoner-stats"
import { formatDuration, formatMatchDate, getGameType } from "@/lib/game-utils"

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
    const blue = match.teams.find((team) => team.teamId === 100)
    const red = match.teams.find((team) => team.teamId === 200)
    const blueKills = Number(getObjectiveValue(blue, "champion_kills"))
    const redKills = Number(getObjectiveValue(red, "champion_kills"))
    return [
      { label: "Kills", blue: blueKills, red: redKills },
      { label: "Deaths", blue: redKills, red: blueKills },
      { label: "Turrets", blue: getObjectiveValue(blue, "tower_kills"), red: getObjectiveValue(red, "tower_kills") },
      { label: "Inhibitors", blue: getObjectiveValue(blue, "inhibitor_kills"), red: getObjectiveValue(red, "inhibitor_kills") },
    ]
  }, [match])

  if (loading) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Cargando detalles de la partida...</div></div>
  if (error) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-rose-300">{error}</div></div>
  if (!match) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Partida no encontrada</div></div>

  const blueTeam = match.teams.find((team) => team.teamId === 100)
  const redTeam = match.teams.find((team) => team.teamId === 200)
  const winningTeamId = match.teams.find((team) => team.win)?.teamId
  const trackedWon = match.players.some((player) => (player.mvp_score || 0) > 0 && player.team_id === winningTeamId)

  return (
    <div className="page-wrap space-y-6">
      <section className="glass-shell p-6">
        <p className="glass-chip mb-4">Match ID: {match.match_id}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="title-gradient text-3xl font-semibold">Detalle de partida</h1>
          <Badge className={`px-4 py-1.5 text-base font-bold ${trackedWon ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}`}>
            {trackedWon ? "VICTORIA" : "DERROTA"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="glass-chip">{getGameType(match.queue_id)}</span>
          <span className="glass-chip">Duracion: {formatDuration(match.game_duration_seconds)}</span>
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
              blue={Number(getObjectiveValue(blueTeam, "voidgrub_kills", "voidgrubs_kills", "horde_kills"))}
              red={Number(getObjectiveValue(redTeam, "voidgrub_kills", "voidgrubs_kills", "horde_kills"))}
            />
            <ObjectiveChip type="dragones" blue={Number(getObjectiveValue(blueTeam, "dragon_kills"))} red={Number(getObjectiveValue(redTeam, "dragon_kills"))} />
            <ObjectiveChip type="herald" blue={Number(getObjectiveValue(blueTeam, "riftHerald_kills", "rift_herald_kills"))} red={Number(getObjectiveValue(redTeam, "riftHerald_kills", "rift_herald_kills"))} />
            <ObjectiveChip type="baron" blue={Number(getObjectiveValue(blueTeam, "baron_kills"))} red={Number(getObjectiveValue(redTeam, "baron_kills"))} />
          </div>
          {objectiveRows.map((row) => (
            <div key={row.label} className="glass-card grid grid-cols-3 items-center p-2">
              <span className="text-cyan-100">{String(row.blue)}</span>
              <span className="text-center text-slate-200/80">{row.label}</span>
              <span className="text-right text-rose-100">{String(row.red)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-cyan-200">Equipo Azul</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchPlayers
            players={match.players.filter((player) => player.team_id === 100)}
            onPlayerClick={(_, summonerName) => setHighlightedSummonerName(summonerName)}
            onProfileClick={handleProfileClick}
            matchId={match.match_id}
            showTeams={false}
            highlightedSummonerName={highlightedSummonerName}
            match={match}
            selectedStat={selectedStat}
            onStatChange={setSelectedStat}
            onTooltipChange={handleTooltipChange}
          />
        </CardContent>
      </Card>

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-white">Comparativa avanzada</CardTitle>
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

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-rose-200">Equipo Rojo</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchPlayers
            players={match.players.filter((player) => player.team_id === 200)}
            onPlayerClick={(_, summonerName) => setHighlightedSummonerName(summonerName)}
            onProfileClick={handleProfileClick}
            matchId={match.match_id}
            showTeams={false}
            highlightedSummonerName={highlightedSummonerName}
            match={match}
            selectedStat={selectedStat}
            onStatChange={setSelectedStat}
            onTooltipChange={handleTooltipChange}
          />
        </CardContent>
      </Card>

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-white">Bans por equipo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="glass-card p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-cyan-200/80">Blue bans</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(blueTeam?.bans || []).map((ban, index) => <span key={`blue-ban-${index}`} className="glass-chip">#{ban.champion_id}</span>)}
            </div>
          </div>
          <div className="glass-card p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-rose-200/80">Red bans</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(redTeam?.bans || []).map((ban, index) => <span key={`red-ban-${index}`} className="glass-chip">#{ban.champion_id}</span>)}
            </div>
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
