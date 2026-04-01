'use client'

import { useState, useRef, useEffect } from 'react'

interface OnboardingScreenProps {
  onComplete: (fullName: string, nickname: string) => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep]               = useState<1 | 2 | 3>(1)
  const [fullName, setFullName]       = useState('')
  const [nickname, setNickname]       = useState('')
  const [showNickname, setShowNickname] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const nicknameRef = useRef<HTMLInputElement>(null)
  const nameRef     = useRef<HTMLInputElement>(null)

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('')

  const handleNameEnter = () => {
    if (!fullName.trim()) return
    if (!showNickname) {
      setShowNickname(true)
      setTimeout(() => nicknameRef.current?.focus(), 300)
    }
  }

  const handleNameBlur = () => {
    if (fullName.trim()) handleNameEnter()
  }

  const handleStep1Continue = () => {
    if (!fullName.trim() || !nickname.trim()) return
    setStep(2)
  }

  const handleAcknowledge = () => {
    setAcknowledged(true)
    setTimeout(() => setStep(3), 600)
  }

  const handleFinish = () => {
    onComplete(fullName.trim(), nickname.trim())
  }

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100)
  }, [])

  // ── Step 1 — Sequential Name Entry ──────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center bg-[#F5F3EF] px-6 py-12">
        <h1 className="mb-3 text-[32px] font-semibold tracking-tight text-gray-900">
          Hello, I&apos;m Grozl.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-gray-600">
          Your intelligent coding partner and trusted AI companion. I&apos;d love to get to know you a little better.
        </p>

        <div className="mb-6 w-full rounded-2xl bg-white px-5 py-4 shadow-sm">
          {/* Full name — always visible */}
          <p className="mb-1 text-[13px] text-gray-400">Nice to meet you, I&apos;m...</p>
          <input
            ref={nameRef}
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleNameEnter() }}
            onBlur={handleNameBlur}
            className="w-full bg-transparent text-[17px] font-medium text-gray-900 outline-none placeholder:text-gray-300"
          />

          {/* Nickname — revealed after full name is typed */}
          <div
            style={{
              maxHeight: showNickname ? '100px' : '0',
              opacity: showNickname ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out',
            }}
          >
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-1 text-[13px] text-gray-400">But you can call me...</p>
              <input
                ref={nicknameRef}
                type="text"
                placeholder="Your nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleStep1Continue() }}
                className="w-full bg-transparent text-[17px] font-medium text-gray-900 outline-none placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>

        <button
          onClick={showNickname ? handleStep1Continue : handleNameEnter}
          disabled={showNickname ? (!fullName.trim() || !nickname.trim()) : !fullName.trim()}
          className="w-full rounded-2xl bg-gray-900 py-4 text-[16px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
        <p className="mt-3 w-full text-center text-[13px] text-gray-400">
          You can always change your name later
        </p>
      </div>
    )
  }

  // ── Step 2 — Acknowledge ─────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center bg-[#F5F3EF] px-6 py-12">
        <h1 className="mb-3 text-[32px] font-semibold tracking-tight text-gray-900">
          Hello, I&apos;m Grozl.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-gray-600">
          Your intelligent coding partner and trusted AI companion.
        </p>

        <div className="mb-6 w-full rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[15px] font-bold text-white">
              {initials || '?'}
            </div>
            <div>
              <p className="text-[13px] text-gray-400">Nice to meet you, I&apos;m...</p>
              <p className="text-[17px] font-medium text-gray-900">{fullName}</p>
              <p className="mt-1 text-[13px] text-gray-400">But you can call me...</p>
              <p className="text-[17px] font-medium text-gray-900">{nickname}</p>
            </div>
          </div>
        </div>

        <p className="mb-2 text-[18px] font-semibold text-gray-900">
          Great to meet you, {nickname}!
        </p>
        <p className="mb-6 text-[15px] leading-relaxed text-gray-600">
          A few things to keep in mind before we start:
        </p>

        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[20px]">🤝</span>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Grozl is designed to be helpful, accurate, and safe. Please use it responsibly.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[20px]">🔒</span>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Avoid sharing sensitive personal or financial information in your conversations.
            </p>
          </div>
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={acknowledged}
          className={`w-full rounded-2xl py-4 text-[16px] font-semibold text-white transition ${
            acknowledged ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'
          }`}
        >
          {acknowledged ? '✓ Acknowledged' : 'Acknowledge & Continue'}
        </button>
      </div>
    )
  }

  // ── Step 3 — Premium About Grozl ─────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F3EF] px-6 py-12">
      <div className="flex flex-1 flex-col justify-center">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="text-[12px] font-medium tracking-wide text-indigo-600">WELCOME TO GROZL</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            One Platform.<br />All the World&apos;s Best AI.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
            You&apos;re all set, {nickname}. Here&apos;s what makes Grozl unlike anything else.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mb-8 flex flex-col gap-3">

          <div className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="text-[15px] font-semibold text-gray-900">Coding-First AI</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">Senior Dev Level</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Production-ready code, complexity analysis, and step-by-step debugging — every time.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="text-[15px] font-semibold text-gray-900">Multi-Model Routing</p>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">3 AI Models</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500">
                DeepSeek R1 · Groq Llama · Gemini — best model picked automatically for every query.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="text-[15px] font-semibold text-gray-900">Speaks Your Language</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">Hindi · Hinglish · EN</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Talk in Hindi, Hinglish, or English — Grozl mirrors you naturally.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p className="text-[15px] font-semibold text-gray-900">Remembers You</p>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">AI Memory</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-500">
                Grozl learns your projects and style over time — every chat gets smarter.
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={handleFinish}
          className="w-full rounded-2xl bg-gray-900 py-4 text-[16px] font-semibold text-white transition hover:bg-gray-800 active:scale-[0.98]"
        >
          Start Building →
        </button>
        <p className="mt-3 text-center text-[12px] text-gray-400">
          Free to use · No credit card required
        </p>

      </div>
    </div>
  )
          }
              
