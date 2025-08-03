import { Metadata } from 'next'
import MatchDetailsClient from './match-details-client'

export const metadata: Metadata = {
  title: 'Gordos Tracker - Detalles de Partida',
  description: 'Detalles completos de la partida de League of Legends con estadísticas de jugadores y equipos',
}

export default function MatchDetailsPage() {
  return <MatchDetailsClient />
}