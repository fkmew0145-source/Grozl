import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ── Plan definitions ──────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id:           'free',
    name:         'Free',
    priceInr:     0,
    dailyLimit:   20,
    weeklyLimit:  100,
    features: [
      '20 messages per day',
      '100 messages per week',
      'Access to all AI models',
      'Basic memory',
    ],
  },
  pro: {
    id:           'pro',
    name:         'Pro',
    priceInr:     499,
    dailyLimit:   200,
    weeklyLimit:  1000,
    features: [
      '200 messages per day',
      '1,000 messages per week',
      'Priority model access',
      'Extended memory',
      'Battle Mode',
      'Unified Canvas',
    ],
  },
  pro_max: {
    id:           'pro_max',
    name:         'Pro Max',
    priceInr:     999,
    dailyLimit:   null,          // no daily cap
    weeklyLimit:  2000,
    features: [
      'Up to 2,000 messages per week',
      'No daily message limit',
      '5× more usage than Pro',
      'All Pro features',
      'Agentic Workflows',
      'Earliest access to new models',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

// ── GET — fetch current subscription + usage ──────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get subscription
  let sub = null
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!subData) {
    // Auto-create free subscription
    const { data: newSub } = await supabase
      .from('subscriptions')
      .insert({ user_id: user.id, plan: 'free', status: 'active' })
      .select()
      .single()
    sub = newSub
  } else {
    // Check if subscription expired
    if (subData.plan !== 'free' && new Date(subData.current_period_end) < new Date()) {
      await supabase
        .from('subscriptions')
        .update({ plan: 'free', status: 'expired' })
        .eq('user_id', user.id)
      sub = { ...subData, plan: 'free', status: 'expired' }
    } else {
      sub = subData
    }
  }

  // Get today's usage
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('usage_counters')
    .select('daily_count, weekly_count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  const plan = PLANS[sub?.plan as PlanId] ?? PLANS.free

  return NextResponse.json({
    plan:         sub?.plan ?? 'free',
    planDetails:  plan,
    status:       sub?.status ?? 'active',
    periodEnd:    sub?.current_period_end ?? null,
    usage: {
      daily:  usage?.daily_count  ?? 0,
      weekly: usage?.weekly_count ?? 0,
    },
    limits: {
      daily:  plan.dailyLimit,
      weekly: plan.weeklyLimit,
    },
  })
}

// ── POST — actions: check_limit | create_order | verify_payment ───────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, ...payload } = await req.json()

  // ── Check & increment usage before each message ───────────────────────
  if (action === 'check_limit') {
    // Get current plan
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = sub?.plan ?? 'free'

    // Atomic increment + check via RPC
    const { data, error } = await supabase.rpc('increment_and_check_usage', {
      p_user_id: user.id,
      p_plan:    plan,
    })

    if (error) return NextResponse.json({ allowed: true }) // fail open

    return NextResponse.json(data)
  }

  // ── Create Razorpay order for plan upgrade ────────────────────────────
  if (action === 'create_order') {
    const { planId }: { planId: PlanId } = payload
    const plan = PLANS[planId]
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const razorpayAuth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64')

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${razorpayAuth}` },
      body: JSON.stringify({
        amount:   plan.priceInr * 100,
        currency: 'INR',
        receipt:  `grozl_${planId}_${user.id.slice(0, 8)}_${Date.now()}`,
        notes:    { user_id: user.id, plan: planId },
      }),
    })

    const order = await orderRes.json()
    if (!orderRes.ok) {
      return NextResponse.json({ error: order.error?.description ?? 'Order failed' }, { status: 400 })
    }

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      planName: plan.name,
    })
  }

  // ── Verify payment and activate subscription ──────────────────────────
  if (action === 'verify_payment') {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = payload
    const plan = PLANS[planId as PlanId]
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 30)

    // Activate subscription
    await supabase
      .from('subscriptions')
      .upsert({
        user_id:               user.id,
        plan:                  planId,
        status:                'active',
        razorpay_sub_id:       razorpay_payment_id,
        current_period_start:  new Date().toISOString(),
        current_period_end:    periodEnd.toISOString(),
        updated_at:            new Date().toISOString(),
      })

    // Log payment
    await supabase.from('subscription_payments').insert({
      user_id:             user.id,
      razorpay_payment_id,
      razorpay_order_id,
      plan:                planId,
      amount_inr:          plan.priceInr,
      billing_period_days: 30,
    })

    return NextResponse.json({
      success:  true,
      plan:     planId,
      planName: plan.name,
      periodEnd: periodEnd.toISOString(),
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
