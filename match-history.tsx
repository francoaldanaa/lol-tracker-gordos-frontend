"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMatches } from "@/hooks/use-matches"
import { MatchPlayer } from "@/lib/mongodb"
import MatchPlayers from "@/components/match-players"
import { formatDuration, formatMatchHistoryDate, getGameType } from "@/lib/game-utils"

function getTrackedResult(matchPlayers: MatchPlayer[], winningTeamId?: number): boolean {
  return matchPlayers.some((player) => (player.mvp_score || 0) > 0 && player.team_id === winningTeamId)
}

export default function Component() {
  const { matches, loading, error, page, totalPages, trackedLastWeek, setPage, refetch } = useMatches(10)
  const router = useRouter()
  const [selectedStat, setSelectedStat] = useState("damage")

  const handleRowClick = (player: MatchPlayer, matchId: string) => {
    if (!player.summoner_name) return
    sessionStorage.setItem("highlightedSummonerName", player.summoner_name)
    router.push(`/match-details/${matchId}`)
  }

  const handleProfileClick = (puuid: string, event: React.MouseEvent) => {
    event.stopPropagation()
    router.push(`/profile/${puuid}`)
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="glass-shell p-6 text-center text-slate-200/80">Cargando partidas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrap space-y-4">
        <div className="glass-shell p-6 text-red-300">Error: {error}</div>
        <button onClick={refetch} className="glass-chip border-cyan-300/40">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="glass-shell p-6">
        <h1 className="title-gradient text-4xl font-semibold">Ultimas partidas de Gordos</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="glass-chip">Ultima semana: {trackedLastWeek} partidas</span>
        </div>
      </section>

      <div className="space-y-5">
        {matches.map((match) => {
          const winningTeamId = match.teams.find((team) => team.win)?.teamId
          const isWin = getTrackedResult(match.players, winningTeamId)

          return (
            <Card key={match.match_id} className="glass-shell border-white/15 bg-white/[0.05]">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={isWin ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}>
                      {isWin ? "VICTORIA" : "DERROTA"}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-100">{getGameType(match.queue_id)}</Badge>
                    <span className="text-sm text-slate-300">{formatMatchHistoryDate(match.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="glass-chip">{formatDuration(match.game_duration_seconds)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-1">
                <MatchPlayers
                  players={match.players}
                  showOnlyMvp
                  onPlayerClick={(_, summonerName) => {
                    const player = match.players.find((candidate) => candidate.summoner_name === summonerName)
                    if (player) handleRowClick(player, match.match_id)
                  }}
                  onProfileClick={handleProfileClick}
                  matchId={match.match_id}
                  showTeams={false}
                  match={match}
                  selectedStat={selectedStat}
                  onStatChange={setSelectedStat}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage(Math.max(1, page - 1))}
          className="glass-chip disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .filter((itemPage) => Math.abs(itemPage - page) <= 2 || itemPage === 1 || itemPage === totalPages)
          .map((itemPage, index, arr) => (
            <div key={itemPage} className="flex items-center gap-2">
              {index > 0 && arr[index - 1] !== itemPage - 1 ? <span className="text-slate-300/70">...</span> : null}
              <button
                onClick={() => setPage(itemPage)}
                className={`glass-chip min-w-9 justify-center ${itemPage === page ? "bg-cyan-300/25 text-cyan-100" : ""}`}
              >
                {itemPage}
              </button>
            </div>
          ))}
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          className="glass-chip disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
