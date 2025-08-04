import { useState, useCallback, useRef } from 'react'

interface SummonerStats {
  championWinrate: number
  overallWinrate: number
  positionWinrate: number
  totalGames: number
  championGames: number
  positionGames: number
}

interface UseSummonerStatsReturn {
  stats: SummonerStats | null
  loading: boolean
  error: string | null
  handleHoverStart: (puuid: string, champion: string, position: string) => void
  handleHoverEnd: () => void
}

// Global cache to persist across component re-renders
const statsCache = new Map<string, SummonerStats>()
const loadingCache = new Set<string>()

export function useSummonerStats(): UseSummonerStatsReturn {
  const [stats, setStats] = useState<SummonerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentKeyRef = useRef<string | null>(null)

  const fetchStats = useCallback(async (puuid: string, champion: string, position: string) => {
    const cacheKey = `${puuid}-${champion}-${position}`
    
    // Check if already cached
    if (statsCache.has(cacheKey)) {
      setStats(statsCache.get(cacheKey)!)
      setLoading(false)
      setError(null)
      return
    }

    // Check if already loading
    if (loadingCache.has(cacheKey)) {
      return
    }

    try {
      loadingCache.add(cacheKey)
      setLoading(true)
      setError(null)
      
      const url = `/api/summoner-stats/${puuid}?champion=${encodeURIComponent(champion)}&position=${encodeURIComponent(position)}`

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data: SummonerStats = await response.json()
      
      // Cache the result
      statsCache.set(cacheKey, data)
      
      // Only update state if this is still the current request
      if (currentKeyRef.current === cacheKey) {
        setStats(data)
        setLoading(false)
      }
    } catch (err) {
      if (currentKeyRef.current === cacheKey) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats'
        setError(errorMessage)
        setLoading(false)
      }
    } finally {
      loadingCache.delete(cacheKey)
    }
  }, [])

  const handleHoverStart = useCallback((puuid: string, champion: string, position: string) => {
    const cacheKey = `${puuid}-${champion}-${position}`
    
    currentKeyRef.current = cacheKey

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Check if already cached
    if (statsCache.has(cacheKey)) {
      setStats(statsCache.get(cacheKey)!)
      setLoading(false)
      setError(null)
      return
    }

    // Set loading state immediately for UX feedback
    setStats(null)
    setError(null)
    setLoading(true)

    // Start 1-second timer
    hoverTimeoutRef.current = setTimeout(() => {
      // Only fetch if this is still the current hover target
      if (currentKeyRef.current === cacheKey) {
        fetchStats(puuid, champion, position)
      }
    }, 1000)
  }, [fetchStats])

  const handleHoverEnd = useCallback(() => {
    // Clear the timeout if user stops hovering before 1 second
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    // Clear current key to prevent stale updates
    currentKeyRef.current = null
    
    // Reset states
    setStats(null)
    setLoading(false)
    setError(null)
  }, [])

  return {
    stats,
    loading,
    error,
    handleHoverStart,
    handleHoverEnd
  }
}