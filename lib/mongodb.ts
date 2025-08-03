import { MongoClient, Db } from 'mongodb'

interface MongoDBConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
}

interface Summoner {
  _id: string
  puuid: string
  summoner_name: string
  real_name: string
}

interface MatchPlayer {
  match_id: string
  puuid: string
  summoner_name: string
  real_name: string
  riot_id_game_name?: string
  champion_name: string
  champion_id: number
  champion_level: number
  kills: number
  deaths: number
  assists: number
  position: string
  total_dmg_dealt: number
  total_dmg_dealt_champions: number
  time_ccing_others: number
  vision_score: number
  gold_earned: number
  healing_done: number
  mvp_score: number
  team_id: number
  profile_icon: number
  objectives_stolen: number
  item_0: number
  item_1: number
  item_2: number
  item_3: number
  item_4: number
  item_5: number
  item_6: number
  largest_multi_kill: number
  longest_time_spent_living: number
  quadra_kills: number
  penta_kills: number
  total_minions_killed: number
  total_time_cc_dealt: number
  total_time_spent_dead: number
  summoner1_id: number
  summoner2_id: number
  push_pings: number
  retreat_pings: number
  all_in_pings: number
  assist_me_pings: number
  basic_pings: number
  command_pings: number
  danger_pings: number
  enemy_missing_pings: number
  enemy_vision_pings: number
  get_back_pings: number
  hold_pings: number
  need_vision_pings: number
  on_my_way_pings: number
  vision_cleared_pings: number
  wards_killed: number
  wards_placed: number
  game_ended_in_early_surrender: boolean
  game_ended_in_surrender: boolean
}

interface TeamObjective {
  atakhan_first: boolean
  atakhan_kills: number
  baron_first: boolean
  baron_kills: number
  champion_first: boolean
  champion_kills: number
  dragon_first: boolean
  dragon_kills: number
  inhibitor_first: boolean
  inhibitor_kills: number
  rift_herald_first: boolean
  rift_herald_kills: number
  tower_first: boolean
  tower_kills: number
}

interface Team {
  teamId: number
  win: boolean
  objectives: TeamObjective
  bans: Array<{ champion_id: number }>
}

interface Match {
  match_id: string
  timestamp: string
  num_tracked_summoners: number
  game_duration_seconds: number
  game_mode_id: number
  queue_id: number
  teams: Team[]
  players: MatchPlayer[]
}

class MongoDBService {
  private client: MongoClient | null = null
  private db: Db | null = null
  private config: MongoDBConfig
  private isConnecting: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor(config: MongoDBConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    // If already connected, return
    if (this.db) {
      return
    }

    // If already connecting, wait for the connection
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise
    }

    // Start connection process
    this.isConnecting = true
    this.connectionPromise = this._connect()

    try {
      await this.connectionPromise
    } finally {
      this.isConnecting = false
      this.connectionPromise = null
    }
  }

  private async _connect(): Promise<void> {
    try {
      // Properly encode username and password to handle special characters
      const encodedUsername = encodeURIComponent(this.config.username)
      const encodedPassword = encodeURIComponent(this.config.password)
      const connectionString = `mongodb://${encodedUsername}:${encodedPassword}@${this.config.host}:${this.config.port}/?authSource=${this.config.database}`
      
      // Log the final connection string (with password partially hidden)
      const maskedConnectionString = connectionString.replace(
        /mongodb:\/\/([^:]+):([^@]+)@/,
        (match, username, password) => {
          const maskedPassword = password ? '***' + password.slice(-3) : 'undefined'
          return `mongodb://${username}:${maskedPassword}@`
        }
      )
      
      this.client = new MongoClient(connectionString, {
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      
      await this.client.connect()
      this.db = this.client.db(this.config.database)
      console.log('Connected to MongoDB successfully')
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error)
      this.client = null
      this.db = null
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close()
        console.log('Disconnected from MongoDB')
      } catch (error) {
        console.error('Error disconnecting from MongoDB:', error)
      } finally {
        this.client = null
        this.db = null
      }
    }
  }

  async getRecentMatches(limit: number = 10): Promise<Match[]> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const matches = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      return matches as unknown as Match[]
    } catch (error) {
      console.error('Failed to fetch matches:', error)
      throw error
    }
  }

  async getSummonerByPuuid(puuid: string): Promise<Summoner | null> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('summoners')
      const summoner = await collection.findOne({ puuid })
      return summoner as Summoner | null
    } catch (error) {
      console.error('Failed to fetch summoner:', error)
      return null
    }
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const match = await collection.findOne({ match_id: matchId })
      return match as Match | null
    } catch (error) {
      console.error('Failed to fetch match:', error)
      throw error
    }
  }

  async getMatchByIdWithSummoners(matchId: string): Promise<Match | null> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const match = await collection.findOne({ match_id: matchId })
      
      if (!match) {
        return null
      }

      // Fetch summoner information for all players
      const playersWithSummoners = await Promise.all(
        (match as unknown as Match).players.map(async (player) => {
          const summoner = await this.getSummonerByPuuid(player.puuid)
          return {
            ...player,
            summoner_name: summoner?.summoner_name || player.summoner_name,
            real_name: summoner?.real_name || player.real_name
          }
        })
      )

      return {
        ...(match as unknown as Match),
        players: playersWithSummoners
      }
    } catch (error) {
      console.error('Failed to fetch match with summoners:', error)
      throw error
    }
  }

  async getRecentMatchesWithSummoners(limit: number = 10): Promise<Match[]> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const matches = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      // Fetch summoner information for all players
      const matchesWithSummoners = await Promise.all(
        (matches as unknown as Match[]).map(async (match) => {
          const playersWithSummoners = await Promise.all(
            match.players.map(async (player) => {
              const summoner = await this.getSummonerByPuuid(player.puuid)
              return {
                ...player,
                summoner_name: summoner?.summoner_name || player.summoner_name,
                real_name: summoner?.real_name || player.real_name
              }
            })
          )
          return {
            ...match,
            players: playersWithSummoners
          }
        })
      )

      return matchesWithSummoners
    } catch (error) {
      console.error('Failed to fetch matches with summoners:', error)
      throw error
    }
  }

  async getMatchesByPlayerPuuid(puuid: string): Promise<Match[]> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const matches = await collection
        .find({
          'players.puuid': puuid
        })
        .sort({ timestamp: -1 })
        .toArray()

      // Fetch summoner information for all players
      const matchesWithSummoners = await Promise.all(
        (matches as unknown as Match[]).map(async (match) => {
          const playersWithSummoners = await Promise.all(
            match.players.map(async (player) => {
              const summoner = await this.getSummonerByPuuid(player.puuid)
              return {
                ...player,
                summoner_name: summoner?.summoner_name || player.summoner_name,
                real_name: summoner?.real_name || player.real_name
              }
            })
          )
          return {
            ...match,
            players: playersWithSummoners
          }
        })
      )

      return matchesWithSummoners
    } catch (error) {
      console.error('Failed to fetch matches by player PUUID:', error)
      throw error
    }
  }

  async getPlayerProfile(puuid: string): Promise<{
    puuid: string
    summoner_name: string
    real_name: string
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
    most_played_champions: Array<{ champion: string; games: number }>
    most_played_positions: Array<{ position: string; games: number }>
    teammates_stats: Array<{
      puuid: string
      summoner_name: string
      real_name: string
      games_played: number
      wins: number
      losses: number
      win_rate: number
      average_kills: number
      average_deaths: number
      average_assists: number
      average_mvp_score: number
    }>
    recent_matches: Match[]
  } | null> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }

    try {
      const collection = this.db.collection('matches')
      const matches = await collection
        .find({
          'players.puuid': puuid
        })
        .sort({ timestamp: -1 })
        .toArray()

      if (matches.length === 0) {
        return null
      }

      // Get summoner information
      const summoner = await this.getSummonerByPuuid(puuid)

      // Calculate statistics from all matches
      const playerMatches = (matches as unknown as Match[]).map(match => {
        const player = match.players.find(p => p.puuid === puuid)
        return { match, player }
      }).filter(item => item.player)

      const totalMatches = playerMatches.length
      const wins = playerMatches.filter(item => {
        const team = item.match.teams.find(t => t.teamId === item.player?.team_id)
        return team?.win === true
      }).length
      const losses = totalMatches - wins
      const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0

      // Calculate averages
      const averages = playerMatches.reduce((acc, item) => {
        const player = item.player!
        return {
          kills: acc.kills + player.kills,
          deaths: acc.deaths + player.deaths,
          assists: acc.assists + player.assists,
          mvp_score: acc.mvp_score + (player.mvp_score || 0),
          damage_dealt: acc.damage_dealt + player.total_dmg_dealt,
          damage_to_champions: acc.damage_to_champions + player.total_dmg_dealt_champions,
          gold_earned: acc.gold_earned + player.gold_earned,
          vision_score: acc.vision_score + player.vision_score,
          wards_placed: acc.wards_placed + player.wards_placed,
          wards_killed: acc.wards_killed + player.wards_killed
        }
      }, {
        kills: 0, deaths: 0, assists: 0, mvp_score: 0,
        damage_dealt: 0, damage_to_champions: 0, gold_earned: 0,
        vision_score: 0, wards_placed: 0, wards_killed: 0
      })

      // Calculate most played champions and positions
      const championCounts: { [key: string]: number } = {}
      const positionCounts: { [key: string]: number } = {}

      playerMatches.forEach(item => {
        const player = item.player!
        const champion = player.champion_name
        const position = player.position
        championCounts[champion] = (championCounts[champion] || 0) + 1
        positionCounts[position] = (positionCounts[position] || 0) + 1
      })

      const mostPlayedChampions = Object.entries(championCounts)
        .map(([champion, games]) => ({ champion, games }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)

      const mostPlayedPositions = Object.entries(positionCounts)
        .map(([position, games]) => ({ position, games }))
        .sort((a, b) => b.games - a.games)

      // Calculate teammates statistics
      const teammatesStats: { [puuid: string]: {
        puuid: string
        summoner_name: string
        real_name: string
        games_played: number
        wins: number
        losses: number
        total_kills: number
        total_deaths: number
        total_assists: number
        total_mvp_score: number
      } } = {}

      // Get all summoners from the database
      const summonersCollection = this.db.collection('summoners')
      const allSummoners = await summonersCollection.find({}).toArray() as unknown as Summoner[]
      const summonerPuuidSet = new Set(allSummoners.map(s => s.puuid))

      // Analyze each match to find teammates
      playerMatches.forEach(item => {
        const match = item.match
        const player = item.player!
        
        // Find all players in this match who are also in the summoners collection
        match.players.forEach(matchPlayer => {
          if (matchPlayer.puuid !== puuid && summonerPuuidSet.has(matchPlayer.puuid)) {
            if (!teammatesStats[matchPlayer.puuid]) {
              const teammateSummoner = allSummoners.find(s => s.puuid === matchPlayer.puuid)
              teammatesStats[matchPlayer.puuid] = {
                puuid: matchPlayer.puuid,
                summoner_name: teammateSummoner?.summoner_name || matchPlayer.summoner_name || 'Unknown',
                real_name: teammateSummoner?.real_name || matchPlayer.real_name || 'Unknown',
                games_played: 0,
                wins: 0,
                losses: 0,
                total_kills: 0,
                total_deaths: 0,
                total_assists: 0,
                total_mvp_score: 0
              }
            }

            const teammateStats = teammatesStats[matchPlayer.puuid]
            teammateStats.games_played++

            // Check if they were on the same team
            const isSameTeam = matchPlayer.team_id === player.team_id
            const team = match.teams.find(t => t.teamId === player.team_id)
            const isWin = team?.win === true

            if (isSameTeam) {
              if (isWin) {
                teammateStats.wins++
              } else {
                teammateStats.losses++
              }
            }

            teammateStats.total_kills += matchPlayer.kills
            teammateStats.total_deaths += matchPlayer.deaths
            teammateStats.total_assists += matchPlayer.assists
            teammateStats.total_mvp_score += matchPlayer.mvp_score || 0
          }
        })
      })

      // Convert to array and calculate averages
      const teammatesStatsArray = Object.values(teammatesStats).map(stats => ({
        puuid: stats.puuid,
        summoner_name: stats.summoner_name,
        real_name: stats.real_name,
        games_played: stats.games_played,
        wins: stats.wins,
        losses: stats.losses,
        win_rate: stats.games_played > 0 ? (stats.wins / stats.games_played) * 100 : 0,
        average_kills: stats.games_played > 0 ? stats.total_kills / stats.games_played : 0,
        average_deaths: stats.games_played > 0 ? stats.total_deaths / stats.games_played : 0,
        average_assists: stats.games_played > 0 ? stats.total_assists / stats.games_played : 0,
        average_mvp_score: stats.games_played > 0 ? stats.total_mvp_score / stats.games_played : 0
      })).sort((a, b) => b.games_played - a.games_played)

      return {
        puuid,
        summoner_name: summoner?.summoner_name || 'Unknown',
        real_name: summoner?.real_name || 'Unknown',
        total_matches: totalMatches,
        wins,
        losses,
        win_rate: winRate,
        average_kills: averages.kills / totalMatches,
        average_deaths: averages.deaths / totalMatches,
        average_assists: averages.assists / totalMatches,
        average_mvp_score: averages.mvp_score / totalMatches,
        average_damage_dealt: averages.damage_dealt / totalMatches,
        average_damage_to_champions: averages.damage_to_champions / totalMatches,
        average_gold_earned: averages.gold_earned / totalMatches,
        average_vision_score: averages.vision_score / totalMatches,
        average_wards_placed: averages.wards_placed / totalMatches,
        average_wards_killed: averages.wards_killed / totalMatches,
        most_played_champions: mostPlayedChampions,
        most_played_positions: mostPlayedPositions,
        teammates_stats: teammatesStatsArray,
        recent_matches: playerMatches.slice(0, 5).map(item => item.match)
      }
    } catch (error) {
      console.error('Failed to fetch player profile:', error)
      throw error
    }
  }
}

// Default configuration - you can override these values
const defaultConfig: MongoDBConfig = {
  host: process.env.MONGODB_HOST || 'localhost',
  port: parseInt(process.env.MONGODB_PORT || '27017'),
  username: process.env.MONGODB_USER || '',
  password: process.env.MONGODB_PASS || '',
  database: process.env.MONGODB_DATABASE || 'gordos_lol_tracker'
}

export const mongodbService = new MongoDBService(defaultConfig)
export type { Match, MatchPlayer, Team, TeamObjective, MongoDBConfig, Summoner }