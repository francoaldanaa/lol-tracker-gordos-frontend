import { Metadata } from 'next'
import ProfileClient from './profile-client'

export const metadata: Metadata = {
  title: 'Gordos Tracker - Perfil de Jugador',
  description: 'Perfil detallado del jugador con estadísticas, historial de partidas y análisis de rendimiento',
}

export default function ProfilePage() {
  return <ProfileClient />
}