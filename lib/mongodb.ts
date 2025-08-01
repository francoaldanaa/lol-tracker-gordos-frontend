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
  team_id: number
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

  constructor(config: MongoDBConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
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
      
      this.client = new MongoClient(connectionString)
      await this.client.connect()
      
      this.db = this.client.db(this.config.database)
      console.log('Connected to MongoDB successfully')
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      console.log('Disconnected from MongoDB')
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