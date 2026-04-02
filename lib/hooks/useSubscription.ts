'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SubscriptionData {
  plan:        'free' | 'pro' | 'pro_max'
  planDetails: {
    name:        string
    priceInr:    number
    dailyLimit:  number | null
    weeklyLimit: number
    features:    string[]
  }
  status:    string
  periodEnd: string | null
  usage: {
    daily:  number
    weekly: number
  }
  limits: {
    daily:  number | null
    weekly: number
  }
}

export function useSubscription() {
  const [data,    setData]    = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Returns true if allowed, false if limit hit
  const checkAndIncrement = useCallback(async (): Promise<{
    allowed: boolean
    reason?: 'daily_limit' | 'weekly_limit'
    daily_count:  number
    weekly_count: number
    daily_limit:  number | null
    weekly_limit: number
  }> => {
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_limit' }),
      })
      const result = await res.json()

      // Refresh local state after increment
      refresh()

      if (!result.allowed) {
        const reason = result.daily_count >= (result.daily_limit ?? Infinity)
          ? 'daily_limit'
          : 'weekly_limit'
        return { ...result, reason }
      }

      return result
    } catch {
      return { allowed: true, daily_count: 0, weekly_count: 0, daily_limit: null, weekly_limit: 2000 }
    }
  }, [refresh])

  // Derived helpers
  const isAtDailyLimit = data
    ? data.limits.daily !== null && data.usage.daily >= data.limits.daily
    : false

  const isAtWeeklyLimit = data
    ? data.usage.weekly >= data.limits.weekly
    : false

  const isAtLimit = isAtDailyLimit || isAtWeeklyLimit

  const dailyRemaining = data?.limits.daily !== null && data?.limits.daily !== undefined
    ? Math.max(0, data.limits.daily - data.usage.daily)
    : null  // null = no daily cap (Pro Max)

  const weeklyRemaining = data
    ? Math.max(0, data.limits.weekly - data.usage.weekly)
    : null

  return {
    data,
    loading,
    refresh,
    checkAndIncrement,
    isAtDailyLimit,
    isAtWeeklyLimit,
    isAtLimit,
    dailyRemaining,
    weeklyRemaining,
    plan: data?.plan ?? 'free',
    isPro:    data?.plan === 'pro' || data?.plan === 'pro_max',
    isProMax: data?.plan === 'pro_max',
  }
    }
    
