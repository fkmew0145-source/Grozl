'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

// Reads the saved appearance from grozl_settings on every app load
// and syncs it into next-themes so the correct theme is always applied.
export default function ThemeSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('grozl_settings')
      if (!raw) return
      const settings = JSON.parse(raw)
      if (settings?.appearance) {
        setTheme(settings.appearance) // 'light' | 'dark' | 'system'
      }
    } catch {
      // ignore — silently fall back to next-themes default
    }
  }, [setTheme])

  return null
}
