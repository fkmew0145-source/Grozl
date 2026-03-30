'use client'

import { useState } from 'react'
import { ChevronLeft, Send, Star } from 'lucide-react'

interface FeedbackPageProps {
  onBack: () => void
}

export default function FeedbackPage({ onBack }: FeedbackPageProps) {
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!feedback.trim() && rating === 0) return
    // In future: send to backend
    setSubmitted(true)
  }

  return (
    <div className="flex h-full flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#F2F2F7] px-4 py-4 pt-6">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-200"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-[17px] font-semibold text-gray-900">Help & Feedback</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">

        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[18px] font-semibold text-gray-900">Thank you! 🙏</p>
            <p className="text-[14px] leading-relaxed text-gray-500">
              Your feedback helps us make Grozl better for everyone.
            </p>
            <button
              onClick={onBack}
              className="mt-2 rounded-xl bg-[#4D6BFE] px-6 py-3 text-[15px] font-medium text-white transition hover:bg-[#3d5bee]"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            {/* Rating */}
            <p className="mb-2 px-1 text-[13px] text-gray-500">Rate your experience</p>
            <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl bg-white py-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      star <= (hovered || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Feedback text */}
            <p className="mb-2 px-1 text-[13px] text-gray-500">Tell us more</p>
            <div className="mb-6 rounded-2xl bg-white px-4 py-3">
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="What do you love? What can we improve?"
                rows={5}
                className="w-full resize-none bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Help links */}
            <p className="mb-2 px-1 text-[13px] text-gray-500">Quick Help</p>
            <div className="mb-6 overflow-hidden rounded-2xl bg-white">
              {[
                { emoji: '🐛', label: 'Report a Bug' },
                { emoji: '💡', label: 'Request a Feature' },
                { emoji: '📖', label: 'Read Documentation' },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <button className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-gray-50">
                    <span className="text-[18px]">{item.emoji}</span>
                    <span className="text-[15px] text-gray-800">{item.label}</span>
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 h-px bg-gray-100" />}
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!feedback.trim() && rating === 0}
              className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4D6BFE] py-4 text-[15px] font-medium text-white transition hover:bg-[#3d5bee] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Submit Feedback
            </button>
          </>
        )}
      </div>
    </div>
  )
}
