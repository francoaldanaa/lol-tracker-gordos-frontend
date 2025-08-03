import { NextRequest, NextResponse } from 'next/server'
import { mongodbService } from '@/lib/mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    // Connect to MongoDB
    await mongodbService.connect()
    
    // Get player PUUID from URL params
    const { puuid } = await params
    
    // Get player profile
    const profile = await mongodbService.getPlayerProfile(puuid)
    
    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player profile' },
      { status: 500 }
    )
  }
} 