'use client'

import { useState } from 'react'

interface OnboardingScreenProps {
  onComplete: (fullName: string, nickname: string) => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [fullName, setFullName]   = useState('')
  const [nickname, setNickname]   = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  // Initials from full name
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

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

  // ── Step 1 — Name Entry ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center bg-[#F5F3EF] px-6 py-12">
        <h1 className="mb-3 text-[32px] font-semibold tracking-tight text-gray-900">
          Hello, I&apos;m Grozl.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-gray-600">
          Your intelligent coding partner and trusted AI companion. I&apos;d love to get to know you a little better.
        </p>

        {/* Name card */}
        <div className="mb-6 w-full rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="mb-1 text-[13px] text-gray-400">Nice to meet you, I&apos;m...</p>
          <input
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-transparent text-[17px] font-medium text-gray-900 outline-none placeholder:text-gray-300"
          />
          <div className="my-3 h-px bg-gray-100" />
          <p className="mb-1 text-[13px] text-gray-400">But you can call me...</p>
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleStep1Continue() }}
            className="w-full bg-transparent text-[17px] font-medium text-gray-900 outline-none placeholder:text-gray-300"
          />
        </div>

        <button
          onClick={handleStep1Continue}
          disabled={!fullName.trim() || !nickname.trim()}
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

  // ── Step 2 — Acknowledge ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center bg-[#F5F3EF] px-6 py-12">
        <h1 className="mb-3 text-[32px] font-semibold tracking-tight text-gray-900">
          Hello, I&apos;m Grozl.
        </h1>
        <p className="mb-8 text-[16px] leading-relaxed text-gray-600">
          Your intelligent coding partner and trusted AI companion. I&apos;d love to get to know you a little better.
        </p>

        {/* Frozen name card with avatar */}
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
              Grozl is designed to be helpful, accurate, and safe. Please use it responsibly — avoid requests that could cause harm to yourself or others.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[20px]">🔒</span>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Your conversations may be used to improve Grozl&apos;s responses. Avoid sharing sensitive personal or financial information.
            </p>
          </div>
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={acknowledged}
          className={`w-full rounded-2xl py-4 text-[16px] font-semibold text-white transition ${
            acknowledged
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-900 hover:bg-gray-800'
          }`}
        >
          {acknowledged ? '✓ Acknowledged' : 'Acknowledge & Continue'}
        </button>
      </div>
    )
  }

  // ── Step 3 — About Grozl ────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-start justify-center bg-[#F5F3EF] px-6 py-12">
      <p className="mb-2 text-[18px] font-semibold text-gray-900">Perfect!</p>
      <p className="mb-8 text-[16px] leading-relaxed text-gray-600">
        I look forward to building, creating, and learning together with you.
      </p>
      <p className="mb-5 text-[15px] font-semibold text-gray-800">
        Here&apos;s what makes me different:
      </p>

      <div className="mb-8 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-[22px]">💻</span>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Coding-First, Reasoning-Backed</p>
            <p className="text-[13px] leading-relaxed text-gray-500">
              I think through problems like a senior developer — production-ready code, complexity analysis, and clear explanations every time.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-[22px]">🌐</span>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Multi-Model Intelligence</p>
            <p className="text-[13px] leading-relaxed text-gray-500">
              I route your query to the best AI — DeepSeek R1 for complex reasoning, Groq Llama for fast responses, and Gemini for vision tasks.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-[22px]">🗣️</span>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Speaks Your Language</p>
            <p className="text-[13px] leading-relaxed text-gray-500">
              Hindi, English, Hinglish — I adapt naturally to how you speak. No formality required.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleFinish}
        className="w-full rounded-2xl bg-gray-900 py-4 text-[16px] font-semibold text-white transition hover:bg-gray-800"
      >
        Let&apos;s Go
      </button>
    </div>
  )
        }
              
