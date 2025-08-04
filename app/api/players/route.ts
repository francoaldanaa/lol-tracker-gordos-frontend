import { NextRequest, NextResponse } from 'next/server'
import { mongodbService } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    await mongodbService.connect()
    const db = mongodbService.database
    
    if (!db) {
      throw new Error('Database connection failed')
    }
    
    // Calculate date 14 days ago for last 2 weeks filter
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const timestampFilter = twoWeeksAgo.toISOString()

    // Get all summoners
    const summonersCollection = db.collection('summoners')
    const summoners = await summonersCollection.find({}).toArray()

    // For each summoner, calculate their stats from the last 2 weeks
    const playersStats = await Promise.all(
      summoners.map(async (summoner: any) => {
        const pipeline = [
          {
            $match: {
              timestamp: { $gte: timestampFilter },
              'players.puuid': summoner.puuid
            }
          },
          {
            $unwind: '$players'
          },
          {
            $match: {
              'players.puuid': summoner.puuid
            }
          },
          {
            $addFields: {
              playerWon: {
                $let: {
                  vars: {
                    playerTeam: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$teams',
                            cond: { $eq: ['$$this.teamId', '$players.team_id'] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: '$$playerTeam.win'
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              totalMatches: { $sum: 1 },
              totalWins: {
                $sum: {
                  $cond: [{ $eq: ['$playerWon', true] }, 1, 0]
                }
              },
              totalKills: { $sum: '$players.kills' },
              totalDeaths: { $sum: '$players.deaths' },
              totalAssists: { $sum: '$players.assists' },
              champions: {
                $push: '$players.champion_name'
              },
              positions: {
                $push: '$players.position'
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalMatches: 1,
              totalWins: 1,
              winRate: {
                $cond: [
                  { $gt: ['$totalMatches', 0] },
                  { $multiply: [{ $divide: ['$totalWins', '$totalMatches'] }, 100] },
                  0
                ]
              },
              averageKDA: {
                kills: {
                  $cond: [
                    { $gt: ['$totalMatches', 0] },
                    { $divide: ['$totalKills', '$totalMatches'] },
                    0
                  ]
                },
                deaths: {
                  $cond: [
                    { $gt: ['$totalMatches', 0] },
                    { $divide: ['$totalDeaths', '$totalMatches'] },
                    0
                  ]
                },
                assists: {
                  $cond: [
                    { $gt: ['$totalMatches', 0] },
                    { $divide: ['$totalAssists', '$totalMatches'] },
                    0
                  ]
                }
              },
              champions: 1,
              positions: 1
            }
          }
        ]

        const result = await db.collection('matches').aggregate(pipeline).toArray()
        
        if (result.length === 0) {
          return {
            puuid: summoner.puuid,
            summoner_name: summoner.summoner_name,
            real_name: summoner.real_name,
            totalMatches: 0,
            winRate: 0,
            averageKDA: { kills: 0, deaths: 0, assists: 0 },
            mostPlayedChampion: null,
            mainRole: null
          }
        }

        const stats = result[0]
        
        // Calculate most played champion
        const championCounts: { [key: string]: number } = {}
        stats.champions.forEach((champion: string) => {
          championCounts[champion] = (championCounts[champion] || 0) + 1
        })
        const mostPlayedChampion = Object.entries(championCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || null

        // Calculate main role (most played position)
        const positionCounts: { [key: string]: number } = {}
        stats.positions.forEach((position: string) => {
          positionCounts[position] = (positionCounts[position] || 0) + 1
        })
        const mainRole = Object.entries(positionCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || null

        return {
          puuid: summoner.puuid,
          summoner_name: summoner.summoner_name,
          real_name: summoner.real_name,
          totalMatches: stats.totalMatches,
          winRate: Math.round(stats.winRate * 10) / 10,
          averageKDA: {
            kills: Math.round(stats.averageKDA.kills * 10) / 10,
            deaths: Math.round(stats.averageKDA.deaths * 10) / 10,
            assists: Math.round(stats.averageKDA.assists * 10) / 10
          },
          mostPlayedChampion,
          mainRole
        }
      })
    )

    // Filter out players with no matches and sort by total matches
    const activePlayers = playersStats
      .filter(player => player.totalMatches > 0)
      .sort((a, b) => b.totalMatches - a.totalMatches)

    return NextResponse.json({ players: activePlayers })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}