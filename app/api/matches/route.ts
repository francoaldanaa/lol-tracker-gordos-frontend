import { NextRequest, NextResponse } from 'next/server'
import { mongodbService } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Connect to MongoDB
    await mongodbService.connect()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const matchId = searchParams.get('matchId')
    const playerPuuid = searchParams.get('playerPuuid')
    
    let matches
    
    if (matchId) {
      // Get specific match
      const match = await mongodbService.getMatchById(matchId)
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
      matches = [match]
    } else if (playerPuuid) {
      // Get matches by player PUUID
      matches = await mongodbService.getMatchesByPlayerPuuid(playerPuuid)
    } else {
      // Get recent matches with summoner information
      matches = await mongodbService.getRecentMatchesWithSummoners(limit)
    }
    
    // Disconnect from MongoDB
    await mongodbService.disconnect()
    
    return NextResponse.json({ matches })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
} 