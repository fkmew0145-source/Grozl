'use client'

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface MessageListProps {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  renderContent: (content: string | ContentPart[], isAssistant: boolean, isLast: boolean) => React.ReactNode
}

export default function MessageList({ messages, messagesEndRef, renderContent }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-16">
      <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mr-2.5 mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <img src="/logo.png" alt="Grozl" className="h-full w-full object-contain" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#4D6BFE] text-white'
                : 'border border-gray-100 dark:border-transparent bg-white dark:bg-transparent text-gray-800 dark:text-[#ececec] shadow-sm dark:shadow-none'
            }`}>
              {renderContent(msg.content, msg.role === 'assistant', i === messages.length - 1)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
