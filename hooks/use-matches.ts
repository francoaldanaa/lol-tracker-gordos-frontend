import { useState, useEffect } from 'react'
import { Match } from '@/lib/mongodb'

interface UseMatchesReturn {
  matches: Match[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMatches(limit: number = 10): UseMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/matches?limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }
      
      const data = await response.json()
      setMatches(data.matches || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [limit])

  const refetch = () => {
    fetchMatches()
  }

  return { matches, loading, error, refetch }
}