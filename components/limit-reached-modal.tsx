'use client'

import { Zap, Crown, X } from 'lucide-react'

interface LimitReachedModalProps {
  reason:      'daily_limit' | 'weekly_limit'
  currentPlan: string
  onClose:     () => void
  onUpgrade:   () => void  // navigates to plans page
}

export default function LimitReachedModal({
  reason,
  currentPlan,
  onClose,
  onUpgrade,
}: LimitReachedModalProps) {
  const isDaily  = reason === 'daily_limit'
  const isOnPro  = currentPlan === 'pro'
  const isOnFree = currentPlan === 'free'

  const title = isDaily
    ? "You've reached your daily limit"
    : "You've reached your weekly limit"

  const subtitle = isOnFree
    ? isDaily
      ? "Free plan allows 20 messages per day. Upgrade to Pro for 200 messages/day or Pro Max for no daily limit."
      : "Free plan allows 100 messages per week. Upgrade to continue chatting."
    : isOnPro
      ? isDaily
        ? "Pro plan allows 200 messages per day. Upgrade to Pro Max to remove the daily limit."
        : "Pro plan allows 1,000 messages per week. Upgrade to Pro Max for 2,000 messages/week."
      : "You've reached your weekly message limit. Your limit resets on Monday."

  const resetNote = isDaily
    ? "Your daily limit resets at midnight."
    : "Your weekly limit resets every Monday."

  const showUpgrade = currentPlan !== 'pro_max'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', padding: '0 20px',
    }}>
      <div style={{
        background: 'var(--background)', borderRadius: 20,
        padding: '24px 20px', maxWidth: 360, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            border: 'none', background: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted-foreground)',
          }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 16, marginBottom: 16,
          background: 'rgba(99,102,241,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={24} color="#6366f1" />
        </div>

        {/* Text */}
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.65, marginBottom: 6 }}>
          {subtitle}
        </div>
        <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 22 }}>
          {resetNote}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showUpgrade && (
            <>
              {/* Pro Max */}
              <button
                onClick={onUpgrade}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 12, fontWeight: 700, fontSize: 15,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Crown size={16} />
                {isOnPro ? 'Upgrade to Pro Max' : 'Upgrade to Pro'}
              </button>

              {/* View all plans */}
              <button
                onClick={onUpgrade}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: 12, fontWeight: 600, fontSize: 14,
                  background: 'transparent',
                  color: 'var(--foreground)',
                  border: '1.5px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                View all plans
              </button>
            </>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px 0',
              borderRadius: 12, fontWeight: 500, fontSize: 14,
              background: 'transparent', color: 'var(--muted-foreground)',
              border: 'none', cursor: 'pointer',
            }}
          >
            OK, I'll wait
          </button>
        </div>
      </div>
    </div>
  )
}
