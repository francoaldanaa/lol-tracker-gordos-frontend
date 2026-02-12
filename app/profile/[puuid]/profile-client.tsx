"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calculateKDA, formatDamage, formatGold, formatNumber, getChampionImageUrl, getItemImageUrl, getPositionDisplay } from "@/lib/game-utils"

interface PlayerProfile {
  puuid: string
  summoner_name: string
  total_matches: number
  wins: number
  losses: number
  win_rate: number
  average_kills: number
  average_deaths: number
  average_assists: number
  average_mvp_score: number
  average_damage_dealt: number
  average_damage_to_champions: number
  average_gold_earned: number
  average_vision_score: number
  average_wards_placed: number
  average_wards_killed: number
  average_pings?: number
  average_danger_pings?: number
  average_on_my_way_pings?: number
  average_enemy_missing_pings?: number
  most_played_champions: Array<{
    champion: string
    games: number
    win_rate?: number
    average_kills?: number
    average_deaths?: number
    average_assists?: number
  }>
  most_played_positions: Array<{ position: string; games: number }>
  teammates_stats: Array<{
    puuid: string
    summoner_name: string
    games_played: number
    wins: number
    losses: number
    win_rate: number
  }>
  recent_matches: any[]
}

export default function ProfileClient() {
  const params = useParams()
  const router = useRouter()
  const puuid = params.puuid as string

  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/player/${puuid}`)
        if (!response.ok) throw new Error("Failed to fetch profile")
        const data = await response.json()
        setProfile(data.profile)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    document.title = "Gordos Tracker - Perfil de Jugador"
  }, [puuid])

  const overview = useMemo(() => {
    if (!profile) return null
    return {
      kda: calculateKDA(profile.average_kills, profile.average_deaths, profile.average_assists),
      mvpGames: profile.recent_matches?.filter((match) => {
        const playerData = (match.players || []).find((player: any) => player.puuid === profile.puuid)
        return (playerData?.mvp_score || 0) > 0
      }).length || 0,
    }
  }, [profile])

  const openMatch = (matchId: string, summonerName: string) => {
    sessionStorage.setItem("highlightedSummonerName", summonerName)
    router.push(`/match-details/${matchId}`)
  }

  const formatRecentMatchDate = (timestamp: string) => {
    const matchDate = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - matchDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 24) {
      return `hace ${Math.max(diffHours, 1)} horas`
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())

    if (matchDay.getTime() === yesterday.getTime()) {
      return "Ayer"
    }

    return matchDate.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  if (loading) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Cargando perfil...</div></div>
  if (error) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-rose-300">Error: {error}</div></div>
  if (!profile || !overview) return <div className="page-wrap"><div className="glass-shell p-6 text-center text-slate-200/80">Perfil no encontrado</div></div>

  return (
    <div className="page-wrap space-y-6">
      <section className="glass-shell p-6">
        <p className="glass-chip mb-4">Player Profile</p>
        <h1 className="title-gradient text-4xl font-semibold">{profile.summoner_name}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="glass-card p-3 text-center"><div className="text-xs text-slate-300/70">Partidas</div><div className="text-2xl font-semibold">{profile.total_matches}</div></div>
          <div className="glass-card p-3 text-center"><div className="text-xs text-slate-300/70">Winrate</div><div className="text-2xl font-semibold text-cyan-100">{formatNumber(profile.win_rate)}%</div></div>
          <div className="glass-card p-3 text-center"><div className="text-xs text-slate-300/70">KDA</div><div className="text-2xl font-semibold text-emerald-100">{formatNumber(overview.kda, 2)}</div></div>
          <div className="glass-card p-3 text-center"><div className="text-xs text-slate-300/70">MVP score</div><div className="text-2xl font-semibold text-amber-100">{formatNumber(profile.average_mvp_score)}</div></div>
          <div className="glass-card p-3 text-center"><div className="text-xs text-slate-300/70">MVP recientes</div><div className="text-2xl font-semibold text-orange-100">{overview.mvpGames}</div></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-shell border-white/15 bg-white/[0.05] lg:col-span-2">
          <CardHeader><CardTitle className="text-white">Rendimiento promedio</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="glass-card p-3 text-sm">
              <div className="text-xs uppercase tracking-[0.1em] text-slate-300/70">Combate</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between"><span>K / D / A</span><span>{formatNumber(profile.average_kills)}/{formatNumber(profile.average_deaths)}/{formatNumber(profile.average_assists)}</span></div>
                <div className="flex justify-between"><span>Daño total</span><span>{formatDamage(profile.average_damage_dealt)}</span></div>
                <div className="flex justify-between"><span>Daño a campeones</span><span>{formatDamage(profile.average_damage_to_champions)}</span></div>
                <div className="flex justify-between"><span>Oro ganado</span><span>{formatGold(profile.average_gold_earned)}</span></div>
              </div>
            </div>
            <div className="glass-card p-3 text-sm">
              <div className="text-xs uppercase tracking-[0.1em] text-slate-300/70">Visión y pings</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between"><span>Visión score</span><span>{formatNumber(profile.average_vision_score)}</span></div>
                <div className="flex justify-between"><span>Wards puestas</span><span>{formatNumber(profile.average_wards_placed)}</span></div>
                <div className="flex justify-between"><span>Wards destruidas</span><span>{formatNumber(profile.average_wards_killed)}</span></div>
                <div className="flex justify-between"><span>Pings totales</span><span>{formatNumber(profile.average_pings || 0)}</span></div>
                <div className="flex justify-between"><span>Pings danger</span><span>{formatNumber(profile.average_danger_pings || 0)}</span></div>
                <div className="flex justify-between"><span>On my way</span><span>{formatNumber(profile.average_on_my_way_pings || 0)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-shell border-white/15 bg-white/[0.05]">
          <CardHeader><CardTitle className="text-white">Posiciones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {profile.most_played_positions.map((position) => (
              <div key={position.position} className="glass-card flex items-center justify-between p-2 text-sm">
                <span>{getPositionDisplay(position.position)}</span>
                <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-100">{position.games}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-shell border-white/15 bg-white/[0.05]">
          <CardHeader><CardTitle className="text-white">Campeones más jugados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {profile.most_played_champions.map((champion) => (
              <div key={champion.champion} className="glass-card flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-black/20">
                    <img
                      src={getChampionImageUrl(champion.champion)}
                      alt={champion.champion}
                      className="block h-full w-full scale-110 object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{champion.champion}</div>
                    <div className="text-xs text-slate-300/70">{champion.games} partidas</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-cyan-100">{formatNumber(champion.win_rate || 0)}%</div>
                  <div className="text-xs text-slate-300/70">WR</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-shell border-white/15 bg-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-white">Duos y compañeros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.teammates_stats.slice(0, 10).map((teammate, index) => (
              <button
                key={teammate.puuid}
                onClick={() => router.push(`/profile/${teammate.puuid}`)}
                className="glass-card group w-full p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-white/25"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{teammate.summoner_name}</div>
                    <div className="text-xs text-slate-300/70">
                      #{index + 1} duo más frecuente
                    </div>
                  </div>
                  <Badge className={`${teammate.win_rate >= 50 ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"} border-0`}>
                    {formatNumber(teammate.win_rate)}%
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white/5 p-2 text-center">
                    <div className="text-slate-300/70">Partidas</div>
                    <div className="font-semibold text-white">{teammate.games_played}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-400/10 p-2 text-center">
                    <div className="text-emerald-100/80">Wins</div>
                    <div className="font-semibold text-emerald-100">{teammate.wins}</div>
                  </div>
                  <div className="rounded-lg bg-rose-400/10 p-2 text-center">
                    <div className="text-rose-100/80">Losses</div>
                    <div className="font-semibold text-rose-100">{teammate.losses}</div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-shell border-white/15 bg-white/[0.05]">
        <CardHeader><CardTitle className="text-white">Partidas recientes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {profile.recent_matches.slice(0, 10).map((match) => {
            const playerData = (match.players || []).find((player: any) => player.puuid === profile.puuid)
            const isWin = (match.teams || []).find((team: any) => team.teamId === playerData?.team_id)?.win
            const kda = `${playerData?.kills ?? 0}/${playerData?.deaths ?? 0}/${playerData?.assists ?? 0}`
            const items = [
              playerData?.item_0,
              playerData?.item_1,
              playerData?.item_2,
              playerData?.item_3,
              playerData?.item_4,
              playerData?.item_5,
              playerData?.item_6,
            ]
            return (
              <button
                key={match.match_id}
                onClick={() => openMatch(match.match_id, profile.summoner_name)}
                className="glass-card group grid w-full grid-cols-1 gap-3 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-white/25 md:grid-cols-[auto_minmax(180px,1fr)_minmax(220px,1fr)_auto] md:items-center"
              >
                <div className="flex items-center gap-2">
                  <Badge className={isWin ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"}>
                    {isWin ? "Victoria" : "Derrota"}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-black/20">
                      {playerData?.champion_name ? (
                        <img
                          src={getChampionImageUrl(playerData.champion_name)}
                          alt={playerData.champion_name}
                          className="block h-full w-full scale-110 object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{playerData?.champion_name || "-"}</div>
                      <div className="text-xs text-slate-300/70">KDA {kda}</div>
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-center gap-1 overflow-x-auto">
                  {items.map((itemId, index) => (
                    <div key={`${match.match_id}-item-${index}`} className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/20 bg-black/20">
                      {itemId > 0 ? (
                        <img
                          src={getItemImageUrl(itemId)}
                          alt={`Item ${itemId}`}
                          className="block h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm text-slate-300/80">
                  {formatRecentMatchDate(match.timestamp)}
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
