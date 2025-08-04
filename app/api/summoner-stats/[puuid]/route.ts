import { NextRequest, NextResponse } from 'next/server'
import { mongodbService } from '@/lib/mongodb'

interface SummonerStats {
  championWinrate: number
  overallWinrate: number
  positionWinrate: number
  totalGames: number
  championGames: number
  positionGames: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params
    const { searchParams } = new URL(request.url)
    const championName = searchParams.get('champion')
    const position = searchParams.get('position')

    if (!puuid || !championName) {
      return NextResponse.json(
        { error: 'Missing required parameters: puuid, champion' },
        { status: 400 }
      )
    }
    
    if (!position || position.trim() === '') {
      return NextResponse.json(
        { error: 'Position required for winrate statistics' },
        { status: 400 }
      )
    }

    await mongodbService.connect()
    const db = mongodbService.database
    
    if (!db) {
      throw new Error('Database connection failed')
    }
    
    // Calculate date 15 days ago
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    const timestampFilter = fifteenDaysAgo.toISOString()
    


    // Aggregate pipeline to get winrate statistics
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: timestampFilter },
          'players.puuid': puuid
        }
      },
      {
        $unwind: '$players'
      },
      {
        $match: {
          'players.puuid': puuid
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
          // Overall stats
          totalGames: { $sum: 1 },
          totalWins: {
            $sum: {
              $cond: [{ $eq: ['$playerWon', true] }, 1, 0]
            }
          },
          // Champion-specific stats
          championGames: {
            $sum: {
              $cond: [{ $eq: ['$players.champion_name', championName] }, 1, 0]
            }
          },
          championWins: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$players.champion_name', championName] },
                    { $eq: ['$playerWon', true] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Position-specific stats
          positionGames: {
            $sum: {
              $cond: [{ $eq: ['$players.position', position] }, 1, 0]
            }
          },
          positionWins: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$players.position', position] },
                    { $eq: ['$playerWon', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalGames: 1,
          championGames: 1,
          positionGames: 1,
          overallWinrate: {
            $cond: [
              { $gt: ['$totalGames', 0] },
              { $multiply: [{ $divide: ['$totalWins', '$totalGames'] }, 100] },
              0
            ]
          },
          championWinrate: {
            $cond: [
              { $gt: ['$championGames', 0] },
              { $multiply: [{ $divide: ['$championWins', '$championGames'] }, 100] },
              0
            ]
          },
          positionWinrate: {
            $cond: [
              { $gt: ['$positionGames', 0] },
              { $multiply: [{ $divide: ['$positionWins', '$positionGames'] }, 100] },
              0
            ]
          }
        }
      }
    ]

    const result = await db.collection('matches').aggregate(pipeline).toArray()
    
    if (result.length === 0) {

      return NextResponse.json({
        championWinrate: 0,
        overallWinrate: 0,
        positionWinrate: 0,
        totalGames: 0,
        championGames: 0,
        positionGames: 0
      })
    }

    const rawStats = result[0]
    

    
    const stats: SummonerStats = {
      championWinrate: Math.round(rawStats.championWinrate * 10) / 10,
      overallWinrate: Math.round(rawStats.overallWinrate * 10) / 10,
      positionWinrate: Math.round(rawStats.positionWinrate * 10) / 10,
      totalGames: rawStats.totalGames,
      championGames: rawStats.championGames,
      positionGames: rawStats.positionGames
    }


    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching summoner stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}