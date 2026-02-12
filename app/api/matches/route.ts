import { NextRequest, NextResponse } from 'next/server'
import { mongodbService } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    await mongodbService.connect()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const matchId = searchParams.get('matchId')
    const playerPuuid = searchParams.get('playerPuuid')
    
    let matches
    
    if (matchId) {
      // Get specific match with summoner information
      const match = await mongodbService.getMatchByIdWithSummoners(matchId)
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
      matches = [match]
    } else if (playerPuuid) {
      matches = await mongodbService.getMatchesByPlayerPuuid(playerPuuid)
    } else {
      const safeLimit = Math.max(1, Math.min(50, limit))
      const safePage = Math.max(1, page)
      const { matches: pagedMatches, total, trackedLastWeek } = await mongodbService.getRecentMatchesWithSummonersPaginated(safeLimit, safePage)
      const totalPages = Math.max(1, Math.ceil(total / safeLimit))
      return NextResponse.json({
        matches: pagedMatches,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          trackedLastWeek,
        },
      })
    }
    
    return NextResponse.json({ matches })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
} 
