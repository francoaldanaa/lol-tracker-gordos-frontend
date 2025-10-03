/**
 * Utility functions for League of Legends game data
 */

/**
 * Get the display color for a position (text color)
 */
export function getPositionColor(position: string): string {
  const normalizedPosition = position?.toUpperCase().trim()
  
  switch (normalizedPosition) {
    case 'TOP': return 'text-blue-400'
    case 'JUNGLE': return 'text-green-400'
    case 'MIDDLE': return 'text-yellow-400'
    case 'BOTTOM': return 'text-red-400'
    case 'UTILITY': return 'text-purple-400'
    default: return 'text-gray-400'
  }
}

/**
 * Get the background color for a position (background color)
 */
export function getPositionBgColor(position: string): string {
  const normalizedPosition = position?.toLowerCase().trim()
  
  switch (normalizedPosition) {
    case 'top': return 'bg-red-500'
    case 'jungle': return 'bg-green-500'
    case 'middle': return 'bg-blue-500'
    case 'bottom': return 'bg-yellow-500'
    case 'utility': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}

/**
 * Get the display name for a position
 */
export function getPositionDisplay(position: string): string {
  const normalizedPosition = position?.toUpperCase().trim()
  
  switch (normalizedPosition) {
    case 'TOP': return 'TOP'
    case 'JUNGLE': return 'JUNGLE'
    case 'MIDDLE': return 'MID'
    case 'BOTTOM': return 'ADC'
    case 'UTILITY': return 'SUPPORT'
    case 'SUPPORT': return 'SUPPORT'
    case 'ADC': return 'ADC'
    case 'MID': return 'MID'
    case 'JG': return 'JUNGLE'
    case 'JUNGLER': return 'JUNGLE'
    case '': return 'UNKNOWN'
    case null:
    case undefined: return 'UNKNOWN'
    default: 
      return position || 'UNKNOWN'
  }
}

/**
 * Format gold amount to display format (e.g., 12.5k)
 */
export function formatGold(gold: number): string {
  return `${(gold / 1000).toFixed(1)}k`
}

/**
 * Format damage amount to display format (e.g., 25.3k)
 */
export function formatDamage(damage: number): string {
  return `${(damage / 1000).toFixed(1)}k`
}

/**
 * Format duration in seconds to minutes and seconds
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Format match date timestamp (Spanish - relative time)
 */
export function formatMatchDate(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return `hace ${diffInMinutes} minutos`
  } else if (diffInHours < 24) {
    return `hace ${diffInHours} horas`
  } else if (diffInDays === 1) {
    return "hace 1 día"
  } else if (diffInDays < 7) {
    return `hace ${diffInDays} días`
  } else {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * Format match date for match history (Today/Yesterday format)
 */
export function formatMatchHistoryDate(timestamp: string): string {
  const matchDate = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
  
  const timeString = matchDate.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
  
  if (matchDay.getTime() === today.getTime()) {
    return `Hoy ${timeString}`
  } else if (matchDay.getTime() === yesterday.getTime()) {
    return `Ayer ${timeString}`
  } else {
    return `${matchDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })} ${timeString}`
  }
}

/**
 * Get game type from queue ID
 */
export function getGameType(queueId: number): string {
  const queueTypes: { [key: number]: string } = {
    400: "NORMAL", // Normal Draft Pick
    420: "RANKED DUO", // Ranked Solo/Duo
    430: "NORMAL", // Normal Blind Pick
    440: "RANKED FLEX", // Ranked Flex
    450: "ARAM",   // ARAM
    700: "CLASH", // Clash
    900: "URF", // URF
    1020: "ONE FOR ALL", // One for All
    1300: "BLITZ", // Nexus Blitz
    1400: "OTRO", // Ultimate Spellbook
  }
  return queueTypes[queueId] || "OTRO"
}

/**
 * Get champion image URL from CDN
 */
export function getChampionImageUrl(championName: string): string {
  if (!championName) return '/placeholder.svg?height=40&width=40&text=Champion'
  
  // Handle special champion name formatting
  let formattedName = championName
  
  // Special cases for champion names that don't match their image file names
  const specialCases: { [key: string]: string } = {
    'Wukong': 'MonkeyKing',
    'Cho\'Gath': 'Chogath',
    'Kai\'Sa': 'Kaisa',
    'Kha\'Zix': 'Khazix',
    'LeBlanc': 'Leblanc',
    'Vel\'Koz': 'Velkoz',
    'Rek\'Sai': 'RekSai',
    'Nunu & Willump': 'Nunu',
    'Renata Glasc': 'Renata'
  }
  
  if (specialCases[championName]) {
    formattedName = specialCases[championName]
  }
  
  // Use CDN instead of local assets
  return `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${formattedName}.png`
}

/**
 * Get item image URL from CDN
 */
export function getItemImageUrl(itemId: number | string): string {
  if (!itemId || itemId === 0) return '/placeholder.svg?height=32&width=32&text=Item'
  
  return `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/item/${itemId}.png`
}

/**
 * Calculate KDA ratio
 */
export function calculateKDA(kills: number, deaths: number, assists: number): number {
  return ((kills + assists) / Math.max(deaths, 1))
}

/**
 * Format number to fixed decimal places with fallback
 */
export function formatNumber(value: number | undefined | null, decimals: number = 1, fallback: string = '0.0'): string {
  return value ? value.toFixed(decimals) : fallback
}

/**
 * Format percentage with color coding
 */
export function getWinrateColor(winrate: number): string {
  if (winrate >= 60) return 'text-green-400'
  if (winrate >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

/**
 * Format KDA color coding
 */
export function getKDAColor(kda: number): string {
  if (kda >= 2) return 'text-green-400'
  if (kda >= 1.5) return 'text-yellow-400'
  return 'text-red-400'
}