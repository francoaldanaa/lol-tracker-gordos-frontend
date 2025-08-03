"use client"

import { useEffect } from 'react'
import Component from "../match-history"

export default function Page() {
  useEffect(() => {
    document.title = 'Gordos Tracker - Historial'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Historial de partidas recientes de League of Legends del grupo Gordos')
    }
  }, [])

  return <Component />
}
