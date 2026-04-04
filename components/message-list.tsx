'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
  provider?: string
}

interface MessageListProps {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  renderContent: (content: string | ContentPart[], isAssistant: boolean, isLast: boolean) => React.ReactNode
  isStreaming?: boolean
  onRegenerate?: (index: number) => void
}

function ProviderChip({ provider }: { provider?: string }) {
  if (!provider) return null
  const map: Record<string, { label: string; color: string }> = {
    'groq-llama':  { label: '⚡ Groq',     color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    'deepseek-r1': { label: '🧠 DeepSeek', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    'gemini':      { label: '✨ Gemini',   color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  }
  const info = map[provider]
  if (!info) return null
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${info.color}`}>
      {info.label}
    </span>
  )
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className={`transition ${className}`} title="Copy">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none
        prose-p:leading-relaxed prose-p:my-1.5
        prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
        prose-h1:text-[18px] prose-h2:text-[16px] prose-h3:text-[15px]
        prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white
        prose-ul:my-1.5 prose-ul:pl-4 prose-ol:my-1.5 prose-ol:pl-4
        prose-li:my-0.5 prose-li:leading-relaxed
        prose-blockquote:border-l-2 prose-blockquote:border-indigo-400 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-gray-500 dark:prose-blockquote:text-white/50
        prose-a:text-indigo-500 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-hr:border-gray-200 dark:prose-hr:border-white/10
        prose-table:text-[13px] prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5"
      style={{ fontSize: 'var(--chat-font-size, 15px)' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const codeText = String(children).replace(/\n$/, '')
            const isBlock = codeText.includes('\n') || !!match
            if (!isBlock) {
              return (
                <code className="rounded px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-[13px] font-mono text-rose-500 dark:text-rose-400">
                  {children}
                </code>
              )
            }
            return (
              <div className="relative my-3 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between bg-gray-100 dark:bg-white/[0.07] px-3 py-1.5">
                  <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wide">
                    {match?.[1] || 'code'}
                  </span>
                  <CopyButton text={codeText} className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60" />
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match?.[1] || 'text'}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', fontSize: '13px', padding: '12px 16px' }}
                >
                  {codeText}
                </SyntaxHighlighter>
              </div>
            )
          },
          a({ href, children }: any) {
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block animate-pulse font-light text-gray-400 dark:text-white/30">▌</span>
      )}
    </div>
  )
}

function MessageActions({ content, provider, onRegenerate, isLast }: {
  content: string
  provider?: string
  onRegenerate?: () => void
  isLast: boolean
}) {
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null)
  const plainText = content.replace(/<artifact[\s\S]*?<\/artifact>/g, '').trim()

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <ProviderChip provider={provider} />
      <div className={`flex items-center gap-0.5 ${provider ? 'ml-1.5' : ''}`}>
        <CopyButton
          text={plainText}
          className="rounded-lg p-1.5 text-gray-400 dark:text-white/25 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60"
        />
        <button
          onClick={() => setLiked(liked === 'up' ? null : 'up')}
          className={`rounded-lg p-1.5 transition ${liked === 'up' ? 'text-green-500' : 'text-gray-400 dark:text-white/25 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60'}`}
          title="Good response"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => setLiked(liked === 'down' ? null : 'down')}
          className={`rounded-lg p-1.5 transition ${liked === 'down' ? 'text-red-500' : 'text-gray-400 dark:text-white/25 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60'}`}
          title="Bad response"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
        {isLast && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="rounded-lg p-1.5 text-gray-400 dark:text-white/25 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60 transition"
            title="Regenerate"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function MessageList({ messages, messagesEndRef, renderContent, isStreaming, onRegenerate }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-16">
      <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
        {messages.map((msg, i) => {
          const isAssistant    = msg.role === 'assistant'
          const isLast         = i === messages.length - 1
          const isThisStreaming = isLast && isStreaming && isAssistant

          return (
            <div key={i} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
              {isAssistant && (
                <div className="mr-2.5 mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
                </div>
              )}
              <div className={`flex flex-col ${isAssistant ? 'max-w-[88%]' : 'max-w-[85%]'}`}>
                <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  isAssistant
                    ? 'border border-gray-100 dark:border-transparent bg-white dark:bg-transparent text-gray-800 dark:text-[#ececec] shadow-sm dark:shadow-none'
                    : 'bg-[#4D6BFE] text-white'
                }`}>
                  {isAssistant && typeof msg.content === 'string' && msg.content !== ''
                    ? <MarkdownContent content={msg.content.replace(/<artifact[\s\S]*?<\/artifact>/g, '').trim()} isStreaming={isThisStreaming} />
                    : renderContent(msg.content, isAssistant, isLast)
                  }
                </div>
                {isAssistant && typeof msg.content === 'string' && msg.content !== '' && !isThisStreaming && (
                  <MessageActions
                    content={msg.content}
                    provider={msg.provider}
                    onRegenerate={onRegenerate ? () => onRegenerate(i) : undefined}
                    isLast={isLast}
                  />
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
      }
                
