'use client'

import { Zap, Crown, Lock } from 'lucide-react'

interface LimitBannerProps {
  plan: string
  dailyUsed?: number
  dailyLimit?: number | null
  weeklyUsed?: number
  weeklyLimit?: number
  onUpgrade: () => void   // opens Settings → Plans page
}

export default function LimitBanner({
  plan,
  dailyUsed,
  dailyLimit,
  weeklyUsed,
  weeklyLimit,
  onUpgrade,
}: LimitBannerProps) {
  const isGuest   = plan === 'guest'
  const isPro     = plan === 'pro'
  const isWeekly  = dailyLimit === null && weeklyUsed !== undefined && weeklyLimit !== undefined

  // What limit was hit?
  const hitWeekly = isWeekly || (weeklyLimit && weeklyUsed !== undefined && weeklyUsed >= weeklyLimit)

  const title = isGuest
    ? 'Sign in to keep chatting'
    : hitWeekly
      ? 'Weekly limit reached'
      : 'Daily limit reached'

  const subtitle = isGuest
    ? 'You've used your 5 free messages. Create a free account to get 20 messages/day.'
    : isPro
      ? hitWeekly
        ? `You've used all ${weeklyLimit} messages this week. Upgrade to Pro Max for 2,000/week.`
        : `You've used all ${dailyLimit} messages today. Upgrade to Pro Max for no daily limit.`
      : hitWeekly
        ? `You've used all ${weeklyLimit} messages this week. Upgrade for more.`
        : `You've used all ${dailyLimit} messages today. Upgrade for more.`

  const ctaLabel = isGuest
    ? 'Create Free Account'
    : isPro
      ? 'Upgrade to Pro Max'
      : 'Upgrade Plan'

  const Icon = isGuest ? Lock : isPro ? Crown : Zap

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-[12.5px] text-gray-500 dark:text-white/50 leading-relaxed">{subtitle}</p>

          {/* Usage bar — only for logged-in users */}
          {!isGuest && dailyLimit && dailyUsed !== undefined && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.min((dailyUsed / dailyLimit) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-white/30">
                {dailyUsed}/{dailyLimit} messages used today
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-indigo-100 dark:border-indigo-500/20 px-4 py-3">
        <button
          onClick={onUpgrade}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[13.5px] font-semibold text-white transition active:opacity-80 hover:bg-indigo-700"
        >
          <Zap className="h-3.5 w-3.5" />
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
  
