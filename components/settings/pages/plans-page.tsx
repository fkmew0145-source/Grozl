'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Check, Zap, Crown } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

interface PlansPageProps {
  onBack: () => void
}

interface SubData {
  plan:      string
  status:    string
  periodEnd: string | null
  usage: { daily: number; weekly: number }
  limits: { daily: number | null; weekly: number }
}

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    null,
    icon:     null,
    color:    '#6b7280',
    features: [
      { text: '20 messages per day',     included: true },
      { text: '100 messages per week',   included: true },
      { text: 'Access to all AI models', included: true },
      { text: 'Basic memory',            included: true },
      { text: 'Battle Mode',             included: false },
      { text: 'Unified Canvas',          included: false },
      { text: 'Agentic Workflows',       included: false },
      { text: 'Priority access',         included: false },
    ],
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    499,
    icon:     'zap',
    color:    '#6366f1',
    badge:    'Most Popular',
    features: [
      { text: '200 messages per day',       included: true },
      { text: '1,000 messages per week',    included: true },
      { text: 'Access to all AI models',    included: true },
      { text: 'Extended memory',            included: true },
      { text: 'Battle Mode',                included: true },
      { text: 'Unified Canvas',             included: true },
      { text: 'Agentic Workflows',          included: false },
      { text: 'Priority access',            included: false },
    ],
  },
  {
    id:       'pro_max',
    name:     'Pro Max',
    price:    999,
    icon:     'crown',
    color:    '#f59e0b',
    features: [
      { text: 'Up to 2,000 messages/week', included: true },
      { text: 'No daily message limit',    included: true },
      { text: '5× more usage than Pro',    included: true },
      { text: 'Extended memory',           included: true },
      { text: 'Battle Mode',               included: true },
      { text: 'Unified Canvas',            included: true },
      { text: 'Agentic Workflows',         included: true },
      { text: 'Earliest new model access', included: true },
    ],
  },
]

export default function PlansPage({ onBack }: PlansPageProps) {
  const [subData,      setSubData]      = useState<SubData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [upgrading,    setUpgrading]    = useState<string | null>(null)
  const [razorLoaded,  setRazorLoaded]  = useState(false)
  const [successPlan,  setSuccessPlan]  = useState<string | null>(null)

  useEffect(() => {
    fetchSub()
    // Load Razorpay
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const s = document.createElement('script')
      s.src     = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload  = () => setRazorLoaded(true)
      document.body.appendChild(s)
    } else {
      setRazorLoaded(true)
    }
  }, [])

  async function fetchSub() {
    setLoading(true)
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) setSubData(await res.json())
    } finally { setLoading(false) }
  }

  async function handleUpgrade(planId: string) {
    if (!razorLoaded) return
    setUpgrading(planId)

    try {
      const res = await fetch('/api/subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'create_order', planId }),
      })
      const order = await res.json()
      if (!res.ok) { alert(order.error ?? 'Could not create order'); return }

      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency,
        order_id:    order.orderId,
        name:        'Grozl AI',
        description: `${order.planName} — Monthly`,
        theme:       { color: planId === 'pro_max' ? '#f59e0b' : '#6366f1' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/subscription', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action: 'verify_payment', ...response, planId }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            setSuccessPlan(verifyData.planName)
            fetchSub()
          } else {
            alert('Payment verification failed. Please contact support.')
          }
        },
        modal: { ondismiss: () => setUpgrading(null) },
      })
      rzp.open()
    } finally {
      setUpgrading(null)
    }
  }

  const currentPlan = subData?.plan ?? 'free'

  // Usage bar helpers
  const dailyUsed      = subData?.usage.daily  ?? 0
  const weeklyUsed     = subData?.usage.weekly ?? 0
  const dailyLimit     = subData?.limits.daily  // null = no cap
  const weeklyLimit    = subData?.limits.weekly ?? 100
  const dailyPercent   = dailyLimit  ? Math.min(100, (dailyUsed  / dailyLimit)  * 100) : 0
  const weeklyPercent  = Math.min(100, (weeklyUsed / weeklyLimit) * 100)

  return (
    <div style={{ minHeight: '100%', background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px 10px', paddingTop: 48,
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: 'none', background: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Plans</span>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

        {/* Success banner */}
        {successPlan && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Check size={18} color="#10b981" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>
                {successPlan} activated!
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Your plan is now active for 30 days.
              </div>
            </div>
          </div>
        )}

        {/* Usage card — shown when logged in */}
        {!loading && subData && (
          <div style={{
            borderRadius: 16, padding: '16px 18px', marginBottom: 24,
            border: '1px solid var(--border)', background: 'var(--card)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
            }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 2 }}>Current plan</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {PLANS.find(p => p.id === currentPlan)?.name ?? 'Free'}
                </div>
              </div>
              {subData.periodEnd && currentPlan !== 'free' && (
                <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'right' }}>
                  Renews<br />
                  {new Date(subData.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>

            {/* Daily usage bar */}
            {dailyLimit !== null && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, marginBottom: 5, opacity: 0.7,
                }}>
                  <span>Daily messages</span>
                  <span>{dailyUsed} / {dailyLimit}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${dailyPercent}%`,
                    background: dailyPercent >= 90 ? '#ef4444' : '#6366f1',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Weekly usage bar */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, marginBottom: 5, opacity: 0.7,
              }}>
                <span>Weekly messages</span>
                <span>{weeklyUsed} / {weeklyLimit}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${weeklyPercent}%`,
                  background: weeklyPercent >= 90 ? '#ef4444' : '#6366f1',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {dailyPercent >= 90 && dailyLimit !== null && (
              <div style={{
                marginTop: 10, padding: '7px 10px', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', fontSize: 12, color: '#ef4444',
              }}>
                You're approaching your daily limit. Upgrade for more messages.
              </div>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.id
            const isDowngrade = (
              (currentPlan === 'pro_max' && plan.id === 'pro') ||
              (currentPlan !== 'free'    && plan.id === 'free')
            )

            return (
              <div
                key={plan.id}
                style={{
                  borderRadius: 16,
                  border: `${isCurrent ? 2 : 1.5}px solid ${isCurrent ? plan.color : 'var(--border)'}`,
                  padding: '18px 18px 16px',
                  background: isCurrent ? `${plan.color}08` : 'var(--card)',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {/* Badge */}
                {'badge' in plan && plan.badge && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: -11, left: 16,
                    padding: '2px 10px', borderRadius: 99,
                    background: plan.color, color: 'white',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -11, right: 16,
                    padding: '2px 10px', borderRadius: 99,
                    background: plan.color, color: 'white',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    Current plan
                  </div>
                )}

                {/* Plan header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${plan.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {plan.icon === 'crown' && <Crown size={18} color={plan.color} />}
                    {plan.icon === 'zap'   && <Zap   size={18} color={plan.color} />}
                    {!plan.icon            && <div style={{ width: 8, height: 8, borderRadius: '50%', background: plan.color }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{plan.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.55 }}>
                      {plan.price ? `₹${plan.price}/month` : 'Always free'}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {plan.features.map(f => (
                    <div key={f.text} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      opacity: f.included ? 1 : 0.35,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        background: f.included ? `${plan.color}20` : 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {f.included
                          ? <Check size={10} color={plan.color} strokeWidth={3} />
                          : <span style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>–</span>
                        }
                      </div>
                      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                {plan.id !== 'free' && !isCurrent && !isDowngrade && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    style={{
                      width: '100%', padding: '12px 0',
                      borderRadius: 12, fontWeight: 700, fontSize: 15,
                      background: upgrading === plan.id ? 'var(--muted)' : plan.color,
                      color: upgrading === plan.id ? 'var(--muted-foreground)' : 'white',
                      border: 'none', cursor: upgrading === plan.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {upgrading === plan.id
                      ? 'Processing...'
                      : `Upgrade to ${plan.name} — ₹${plan.price}/mo`}
                  </button>
                )}

                {isCurrent && plan.id !== 'free' && (
                  <div style={{
                    textAlign: 'center', fontSize: 13, opacity: 0.5,
                    padding: '8px 0 0',
                  }}>
                    ✓ Active — renews automatically
                  </div>
                )}

                {isCurrent && plan.id === 'free' && (
                  <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.4, paddingTop: 4 }}>
                    Upgrade anytime to unlock more messages
                  </div>
                )}

                {isDowngrade && (
                  <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.35, paddingTop: 4 }}>
                    Active after current period ends
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 20, fontSize: 12, opacity: 0.4, textAlign: 'center', lineHeight: 1.6,
        }}>
          Payments processed securely by Razorpay.{'\n'}
          Subscriptions renew every 30 days. Cancel anytime.
        </div>
      </div>
    </div>
  )
        }
          
