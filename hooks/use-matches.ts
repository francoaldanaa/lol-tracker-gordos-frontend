import { useState, useEffect } from 'react'
import { Match } from '@/lib/mongodb'

interface UseMatchesReturn {
  matches: Match[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  total: number
  trackedLastWeek: number
  setPage: (page: number) => void
  refetch: () => void
}

export function useMatches(limit: number = 10): UseMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [trackedLastWeek, setTrackedLastWeek] = useState(0)

  const fetchMatches = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/matches?limit=${limit}&page=${page}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }
      
      const data = await response.json()
      setMatches(data.matches || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
      setTrackedLastWeek(data.pagination?.trackedLastWeek || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [limit, page])

  const refetch = () => {
    fetchMatches()
  }

  return { matches, loading, error, page, totalPages, total, trackedLastWeek, setPage, refetch }
}
