import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Simple in-memory rate limiter ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT   = 30
const RATE_WINDOW  = 60_000

function checkRateLimit(ip: string): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++; return true
}

interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface PersonalizationPayload {
  baseTone?: string
  characteristics?: string[]
  customInstructions?: string
  nickname?: string
  occupation?: string
  aboutYou?: string
}

// ── Build personalised addition to system prompt ─────────────────────────
function buildPersonalizationBlock(p: PersonalizationPayload | undefined): string {
  if (!p) return ''
  const lines: string[] = []

  if (p.baseTone && p.baseTone !== 'default') {
    const toneMap: Record<string, string> = {
      formal:    'Always maintain a formal and professional tone. Use structured, precise language.',
      casual:    'Keep a casual, relaxed, and friendly tone throughout the conversation.',
      technical: 'Use deep technical depth. Assume expertise. Code-first, no hand-holding.',
      concise:   'Be strictly concise. No filler words, no preamble. Answer only what is asked.',
      friendly:  'Be warm, supportive, and encouraging in every response.',
      humorous:  'Maintain a light-hearted, witty tone with occasional humour where appropriate.',
    }
    if (toneMap[p.baseTone]) lines.push(`**Tone Override:** ${toneMap[p.baseTone]}`)
  }

  if (p.characteristics?.length) {
    lines.push(`**Response Characteristics:** ${p.characteristics.join(', ')}.`)
  }

  if (p.customInstructions?.trim()) {
    lines.push(`**User's Custom Instructions:**\n${p.customInstructions.trim()}`)
  }

  const about: string[] = []
  if (p.nickname?.trim())    about.push(`The user's name/nickname is "${p.nickname.trim()}".`)
  if (p.occupation?.trim())  about.push(`Their occupation is: ${p.occupation.trim()}.`)
  if (p.aboutYou?.trim())    about.push(`About them: ${p.aboutYou.trim()}`)
  if (about.length)          lines.push(`**User Info:**\n${about.join(' ')}`)

  if (!lines.length) return ''
  return `\n\n---\n## USER PERSONALIZATION SETTINGS (Follow strictly)\n${lines.join('\n\n')}`
}

// ── System prompt ────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `
## CORE IDENTITY
You are **Grozl**. You are **Coding-First, Reasoning-Backed**. Every response reflects:
- A senior developer's precision and production mindset.
- A teacher's patience and clarity.
- A friend's warmth and cultural fluency (Hindi, English, Hinglish — all natural).

You never say "As an AI..." or "I apologize for...". You speak with confidence, treat the user as an equal, and deliver real value every time.

---
## LANGUAGE & TONE ADAPTATION (STRICT MIRRORING)
Instantly detect and mirror the user's language and energy. 

**STRICTEST RULE (DO NOT BREAK):** You have no fixed language. Mirror the user's last message exactly. 
1. **No Mixed Response:** If the user speaks English (e.g., "How are you?"), reply ONLY in English. No Hindi, no Hinglish.
2. **Hinglish Consistency:** If the user speaks Hinglish (e.g., "Bhai, kaise ho?"), reply ONLY in Hinglish. 
3. **ZERO TRANSLATION:** Strictly forbidden to provide English translations in brackets () or explain your response in a second language. 
4. **No Bridging:** Never start in one language and switch to another unless the user's message is itself mixed.

| Situation | Tone | Style |
| :--- | :--- | :--- |
| **Casual / Hinglish** | Warm, witty, relaxed | "Yaar, yeh cheez aise kaam karti hai..." |
| **Teaching / Learning** | Patient, encouraging | "Chalte hain step-by-step..." |
| **Debugging** | Analytical, precise | "The issue is on line 15 — here's why..." |
| **Creative** | Inspiring, open | "3 alag approaches hain, suno..." |
| **Urgent / Quick fix** | Direct, concise | "Quick fix: change type to int." |
| **Emotional / Personal** | Empathetic, warm | Listen first, solve only when asked. |

**Default to Hinglish** only when the user mixes Hindi and English. Use Indian cultural references naturally.

---
## UNIVERSAL RESPONSE STRUCTURE
For complex or technical queries, follow this structure:

### 1. Summary (1-3 lines)
What the user asked + the approach you are taking.

### 2. Plan
- Bullet steps showing your thinking.
- Assumptions stated explicitly.
- Scope defined.

### 3. Core Output
- **Build/Feature:** Full Artifact/Code.
- **Code Snippet:** Runnable, commented code.
- **Refactor/Fix:** Diff patch + explanation.
- **Concept:** Clear explanation with examples.

### 4. Validation
- How to run, test, and verify.
- Time & space complexity (Big-O notation).
- Performance notes.

### 5. Pitfall Radar
- Input validation, edge cases, and security (injection, secrets).
- Resource limits and common beginner mistakes.

### 6. Alternatives & Trade-offs
- 2-3 viable alternatives and a clear trade-off table when helpful.

### 7. Next Steps
- Practical follow-ups and 2-3 sample prompts.

**Note:** For simple/factual queries, skip this structure. Answer in 1-5 lines in the user's language. Do not over-engineer.

---
## CODING IDENTITY — Three-Layer Delivery
Always provide code in layers when relevant:
1. **Starter:** Clean, minimal, runnable solution.
2. **Optimized:** Refined with performance & structure improvements.
3. **Production+:** Testing, observability, and scalability notes.

### Code Quality Bar
- Idiomatic for the language/framework.
- Strong naming, small functions, Single Responsibility Principle.
- Comments only for non-obvious logic — prefer self-documenting code.
- Type hints/annotations when supported.
- Always include time/space complexity for algorithms.
- Tests included for functions with logic branches.

### Evidence-Based Coding
- Always label complexity: O(n), O(log n), etc.
- Explain data structure choice rationale.
- Show micro-benchmark approach when performance matters.
- Know when to stop optimizing — state the trade-off clearly.

### Debug Protocol
When debugging: Reproduce -> Isolate -> Hypothesize -> Patch -> Verify -> Prevent.
- Provide logging/trace suggestions.
- Add a regression test when fixing a bug.
- Explain root cause, not just the fix.

## ARTIFACT FEATURE — Grozl Artifacts

When a user asks to build something (app, CLI, library, module, config), deliver a Grozl Artifact — a complete, structured, runnable output.

Use this XML-style block for artifacts:

<artifact type="[webapp|cli|library|config|notebook]" language="[lang]" title="[name]">
[full file contents or file tree with contents]
</artifact>

---

## FORMATTING STANDARDS

| Element | When to Use |
|---------|------------|
| ## Headings | Section breaks in complex answers |
| Numbered lists | Sequential steps |
| Bullet lists | Features, options, non-sequential items |
| Tables | Comparisons, trade-offs, feature matrices |
| Code fences with language tag | All code blocks |

Do NOT over-format casual answers. Plain conversational prose for simple queries.

---

## SECURITY & QUALITY GUARDRAILS

- Never output real secrets, tokens, or passwords — always use placeholders
- Sanitize user inputs in all code examples
- No unsafe eval/exec by default

---

Grozl = Senior Dev Friend who explains clearly, thinks with you, and helps you write better code. Technical excellence + teaching ability + cultural warmth = Grozl's edge.`

// ── Think + Search mode system block ─────────────────────────────────────
function buildModeBlock(think: boolean, search: boolean, searchResults: string): string {
  if (!think && !search) return ''

  const thinkStatus  = think  ? 'ON' : 'OFF'
  const searchStatus = search ? 'ON' : 'OFF'

  let block = `\n\n---
## ACTIVE MODES
You are Grozl AI. Your behaviour depends on two modes: **Think Mode** and **Search Mode**.

### SEARCH MODE = ${searchStatus}
${search
  ? `You have access to real-time internet search results provided below as [SEARCH_RESULTS].
Use these results to give accurate, up-to-date information.
If results are empty or irrelevant, say so clearly.
When quoting facts, mention the source or date if available.`
  : `Search Mode is OFF. Rely only on your internal knowledge.
If the user asks for real-time info (news, stocks, weather), politely remind them to enable Search.`}

### THINK MODE = ${thinkStatus}
${think
  ? `You must solve the query using explicit step-by-step reasoning.
Break the problem into logical steps.
Show calculations, logic, or reasoning at each stage.
End with a clear conclusion.
Keep the response structured (e.g., Step 1, Step 2, …).`
  : `Think Mode is OFF. Answer conversationally without forcing step-by-step reasoning.`}

### COMBINATION BEHAVIOUR
| Think | Search | Behaviour |
|-------|--------|-----------|
| OFF   | OFF    | Normal conversational answer using internal knowledge. |
| OFF   | ON     | Concise, factual answer based on search results. No step-by-step. |
| ON    | OFF    | Internal knowledge + full step-by-step reasoning. |
| ON    | ON     | (1) Key insights from search → (2) Step-wise reasoning → (3) Final reasoned conclusion. |

**Current Status → Think: ${thinkStatus} | Search: ${searchStatus}**`

  if (search) {
    const resultsText = searchResults?.trim()
      ? searchResults
      : 'No search results found. Answer using internal knowledge and mention that search returned no results.'

    block += `\n\n### [SEARCH_RESULTS]\n${resultsText}`
  }

  return block
}

// ── Routing keywords for auto-detect (used when model = 'auto') ──────────
const CODE_KEYWORDS = [
  'code', 'coding', 'debug', 'error', 'bug', 'fix', 'function', 'class',
  'component', 'api', 'script', 'program', 'algorithm', 'database', 'sql',
  'html', 'css', 'javascript', 'typescript', 'python', 'java', 'react',
  'nextjs', 'node', 'backend', 'frontend', 'build', 'website', 'app',
  'deploy', 'server', 'logic', 'implement', 'write a', 'create a',
  'make a', 'develop', 'math', 'calculate', 'solve', 'equation', 'formula',
  'prove', 'derivation', 'reasoning', 'explain step by step', 'analyze',
  'compare', 'difference between', 'how does', 'architecture', 'refactor',
  'optimize', 'performance', 'complexity', 'test', 'testing', 'unittest',
  'artifact', 'build me', 'create me', 'make me', 'cli', 'library', 'module',
  'integrate', 'design pattern', 'data structure',
  // Hindi/Hinglish variants
  'code karo', 'banao', 'banana hai', 'likhna hai', 'bana do', 'bata',
  'samjhao', 'kaise kaam karta', 'error aa raha', 'fix karo', 'solve karo',
  'optimize karo', 'refactor karo', 'test likho',
]

function isCodeOrReasoningRequest(messages: IncomingMessage[]): boolean {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUserMsg) return false
  const text = (
    typeof lastUserMsg.content === 'string'
      ? lastUserMsg.content
      : lastUserMsg.content.filter(p => p.type === 'text').map(p => p.text || '').join(' ')
  ).toLowerCase()
  return CODE_KEYWORDS.some(kw => text.includes(kw))
}

function hasImageContent(messages: IncomingMessage[]): boolean {
  return messages.some(m => Array.isArray(m.content) && m.content.some((p: ContentPart) => p.type === 'image_url'))
}

// ── Extract plain text from last user message ─────────────────────────────
function getLastUserText(messages: IncomingMessage[]): string {
  const last = [...messages].reverse().find(m => m.role === 'user')
  if (!last) return ''
  return (
    typeof last.content === 'string'
      ? last.content
      : last.content.filter(p => p.type === 'text').map(p => p.text || '').join(' ')
  ).trim()
}

// ── TIER 0 — Ultra-simple local replies (zero API cost) ──────────────────
const GREETING_REPLIES = [
  'Hey! Kya chal raha hai? Kuch kaam hai? 😊',
  'Haan bolo! Main yahan hoon. 🙂',
  'Hello! Batao, kya help chahiye?',
  'Hey yaar! Kya scene hai? 😄',
  'Hi! Bol do kya chahiye. 😊',
]
const THANKS_REPLIES = [
  'Koi baat nahi yaar! 🙌',
  'Always! Aur kuch chahiye?',
  'Mention not! Kabhi bhi bolo. 😊',
  'Arrey koi baat nahi! 🙏',
]
const BYE_REPLIES = [
  'Bye! Take care 👋',
  'Alvida! Jab zarurat ho wapas aana. 😊',
  'See you! Kal milte hain. 🙂',
  'Bye bye! 👋 Kuch aur chahiye toh bolo.',
]
const ACK_REPLIES  = ['👍', 'Theek hai!', 'Alright! Aur kuch?', 'Okay 👌']
const NICE_REPLIES = ['😊', 'Shukriya yaar!', '🙌 Acha laga!', 'Glad to help!']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getUltraSimpleReply(text: string): string | null {
  const t = text.toLowerCase().trim()
  if (t.length > 0 && t.length <= 12 && !/[a-z0-9\u0900-\u097F]/.test(t)) return pick(NICE_REPLIES)
  if (/^(hi+|hello+|hey+|hiya|helo|howdy|namaste|namaskar|sat sri akal|salaam|assalaamu|jai hind|sup|wassup)[\s!.?😊🙂]*$/.test(t)) return pick(GREETING_REPLIES)
  if (/^(thanks?|thank(s| you)+|shukriya|dhanyawad|ty|thnx|thx|mehrbani|shukar hai|shukar)[\s!.?😊🙏]*$/.test(t)) return pick(THANKS_REPLIES)
  if (/^(bye+|goodbye|good bye|alvida|cya|see ya|see you|baad mein|baad me|take care|tc|later|ttyl)[\s!.?👋😊]*$/.test(t)) return pick(BYE_REPLIES)
  if (/^(ok|okay|k|hmm+|hm+|ohh?|ah+|ahan|acha|thik|theek|haan|han|nahi|nope|yep|yup|yes|no|got it|noted|sure|alright|bilkul)[\s!.?]*$/.test(t)) return pick(ACK_REPLIES)
  if (/^(nice|great|awesome|wow|wah+|amazing|kya baat|shabash|bahut badhiya|good|cool|superb|perfect|excellent|badhiya|mast|ekdum|sahi|zabardast)[\s!.?😊🔥👏]*$/.test(t)) return pick(NICE_REPLIES)
  return null
}

// ── TIER 1 — Casual short messages → Groq 512 tokens ────────────────────
function isCasualShort(messages: IncomingMessage[]): boolean {
  const text = getLastUserText(messages)
  if (!text) return false
  const wordCount = text.trim().split(/\s+/).length
  const hasCodeIntent = CODE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))
  return wordCount <= 15 && !hasCodeIntent
}

// ── Web search via Tavily ─────────────────────────────────────────────────
// Add TAVILY_API_KEY to your Vercel environment variables.
// Free tier: 1000 searches/month → https://tavily.com
interface TavilyResult {
  title: string
  url: string
  content: string
  published_date?: string
  score?: number
}

async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return '[Search unavailable: TAVILY_API_KEY not set]'

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
        include_raw_content: false,
      }),
    })

    if (!res.ok) return `[Search failed: HTTP ${res.status}]`

    const data = await res.json()
    const parts: string[] = []

    // Tavily's own AI-generated answer (concise summary)
    if (data.answer) {
      parts.push(`**Quick Answer:** ${data.answer}\n`)
    }

    // Individual results
    if (data.results?.length) {
      data.results.forEach((r: TavilyResult, i: number) => {
        const date = r.published_date ? ` (${r.published_date.slice(0, 10)})` : ''
        parts.push(`[${i + 1}] **${r.title}**${date}\nURL: ${r.url}\n${r.content}`)
      })
    }

    return parts.length ? parts.join('\n\n') : '[No relevant results found]'
  } catch (err) {
    return `[Search error: ${err instanceof Error ? err.message : 'Unknown'}]`
  }
}

// ── Strip DeepSeek <think>...</think> reasoning blocks ───────────────────
function buildDeepSeekStream(response: Response): ReadableStream {
  const encoder = new TextEncoder()
  const reader  = response.body!.getReader()
  const decoder = new TextDecoder()
  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''; let thinkBuffer = ''; let insideThink = false
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6))
                const text = json.choices?.[0]?.delta?.content || ''
                if (!text) continue
                thinkBuffer += text
                thinkBuffer  = thinkBuffer.replace(/<think>[\s\S]*?<\/think>/g, '')
                if (thinkBuffer.includes('<think>')) { insideThink = true; continue }
                if (insideThink) insideThink = false
                if (thinkBuffer) { controller.enqueue(encoder.encode(thinkBuffer)); thinkBuffer = '' }
              } catch { /* skip malformed chunk */ }
            }
          }
        }
        if (thinkBuffer && !thinkBuffer.includes('<think>')) controller.enqueue(encoder.encode(thinkBuffer))
      } finally { controller.close() }
    },
  })
}

// ── DeepSeek R1 via direct API (streaming) ───────────────────────────────
async function callDeepSeek(systemPrompt: string, messages: { role: string; content: string }[]): Promise<Response> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_R1_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-reasoner', messages: [{ role: 'system', content: systemPrompt }, ...messages], stream: true, max_tokens: 8192 }),
  })
  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`)
  return new Response(buildDeepSeekStream(response), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'deepseek-r1' } })
}

// ── Groq Llama streaming ─────────────────────────────────────────────────
// maxTokens: 4096 default | 512 for casual short chat
// temperature: 0.7 default | 0.2 for Think mode (more deterministic)
async function callGroq(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens = 4096,
  temperature = 0.7,
): Promise<Response> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages as Parameters<typeof groq.chat.completions.create>[0]['messages']],
    stream: true,
    max_tokens: maxTokens,
    temperature,
  })
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      async start(controller) {
        try { for await (const chunk of stream) { const text = chunk.choices[0]?.delta?.content || ''; if (text) controller.enqueue(encoder.encode(text)) } }
        finally { controller.close() }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'groq-llama' } }
  )
}

// ── Gemini streaming ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGeminiStreaming(parts: any[]): Promise<Response> {
  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContentStream(parts)
    const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      async start(controller) {
        try { for await (const chunk of result.stream) { const text = chunk.text(); if (text) controller.enqueue(encoder.encode(text)) } }
        finally { controller.close() }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'gemini' } }
  )
}

// ── Gemini text parts helper ─────────────────────────────────────────────
function toGeminiTextParts(systemPrompt: string, messages: { role: string; content: string }[]) {
  return [
    { text: `System: ${systemPrompt}` },
    ...messages.map(m => ({ text: `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}` })),
    { text: 'Assistant:' },
  ]
}

// ── Instant local stream helper ───────────────────────────────────────────
function localStream(text: string): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) { controller.enqueue(encoder.encode(text)); controller.close() },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'local' } }
  )
}

// ── Main handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  const {
    messages,
    model: modelPref = 'auto',
    language,
    personalization,
    think  = false,   // Think Mode — step-by-step reasoning
    search = false,   // Search Mode — real-time web results
  }: {
    messages: IncomingMessage[]
    model?: string
    language?: string
    personalization?: PersonalizationPayload
    think?: boolean
    search?: boolean
  } = await req.json()

  // Fetch user memory from Supabase
  let userMemory = ''
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('user_memories').select('memory').eq('user_id', user.id).single()
      userMemory = data?.memory || ''
    }
  } catch { /* ignore */ }

  // ── Run web search if Search Mode is ON ────────────────────────────────
  // Runs in parallel with nothing (we await here before building prompt)
  let searchResults = ''
  if (search) {
    const query = getLastUserText(messages)
    if (query) searchResults = await webSearch(query)
  }

  // Build complete system prompt
  const languageBlock = language && language !== 'hinglish'
    ? `\n\n---\n## LANGUAGE OVERRIDE\nThe user has set their preferred language to: **${language}**. Respond in this language unless the user writes in a different language mid-conversation.`
    : ''

  const SYSTEM_PROMPT =
    BASE_SYSTEM_PROMPT +
    languageBlock +
    buildPersonalizationBlock(personalization) +
    (userMemory ? `\n\n---\n\n## What You Know About This User\n${userMemory}` : '') +
    buildModeBlock(think, search, searchResults)   // ← Think/Search block appended last

  const containsImage = hasImageContent(messages)

  // ══ ROUTE 1 — Image → Gemini Vision (always, regardless of model pref) ═
  if (containsImage) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: `System: ${SYSTEM_PROMPT}` }]
      for (const msg of messages) {
        const prefix = msg.role === 'user' ? 'User' : 'Assistant'
        if (typeof msg.content === 'string') { parts.push({ text: `${prefix}: ${msg.content}` }) }
        else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) { parts.push({ text: `${prefix}: ${part.text}` }) }
            else if (part.type === 'image_url' && part.image_url?.url) {
              const match = part.image_url.url.match(/^data:(.+);base64,(.+)$/)
              if (match) {
                if ((match[2].length * 0.75) / (1024 * 1024) > 4) return NextResponse.json({ error: 'Image too large. Please use an image under 4MB.' }, { status: 400 })
                parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
              }
            }
          }
        }
      }
      parts.push({ text: 'Assistant:' })
      return await callGeminiStreaming(parts)
    } catch (err: unknown) {
      return NextResponse.json({ error: `Image processing failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 503 })
    }
  }

  // Flatten messages for text APIs
  const flatMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content
      : m.content.filter((p: ContentPart) => p.type === 'text').map((p: ContentPart) => p.text || '').join('\n'),
  }))

  // ══ FORCED MODEL (user picked manually in Settings) ══════════════════
  if (modelPref === 'deepseek') {
    try { return await callDeepSeek(SYSTEM_PROMPT, flatMessages) }
    catch { /* fall through to Groq */ }
  }

  if (modelPref === 'groq') {
    try { return await callGroq(SYSTEM_PROMPT, flatMessages, 4096, think ? 0.2 : 0.7) }
    catch { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)).catch(() => NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 })) }
  }

  if (modelPref === 'gemini') {
    try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
    catch { return NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 }) }
  }

  // ══ AUTO ROUTING ══════════════════════════════════════════════════════

  // ── TIER 0: Ultra-simple → instant local reply (zero API cost) ─────────
  // Skip local reply if Think or Search is ON — user expects a real response
  const lastText = getLastUserText(messages)
  if (!think && !search && lastText) {
    const localReply = getUltraSimpleReply(lastText)
    if (localReply) return localStream(localReply)
  }

  // ── Think Mode ON → DeepSeek R1 (purpose-built reasoning model) ────────
  // DeepSeek R1 is ideal here — it does chain-of-thought natively.
  // Search results are already in SYSTEM_PROMPT so both modes work together.
  if (think) {
    try { return await callDeepSeek(SYSTEM_PROMPT, flatMessages) }
    catch {
      // Fallback: Groq with low temperature for structured reasoning
      try { return await callGroq(SYSTEM_PROMPT, flatMessages, 4096, 0.2) }
      catch {
        try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
        catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
      }
    }
  }

  // ── Search Mode ON (Think OFF) → Groq for fast factual response ─────────
  // Results already injected in prompt. Groq is faster than DeepSeek here.
  if (search) {
    try { return await callGroq(SYSTEM_PROMPT, flatMessages, 4096, 0.5) }
    catch {
      try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
      catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
    }
  }

  // ── TIER 2: Code / reasoning → DeepSeek → Groq → Gemini ───────────────
  if (isCodeOrReasoningRequest(messages)) {
    try { return await callDeepSeek(SYSTEM_PROMPT, flatMessages) }
    catch {
      try { return await callGroq(SYSTEM_PROMPT, flatMessages) }
      catch {
        try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
        catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
      }
    }
  }

  // ── TIER 1: Casual short chat → Groq 512 tokens ────────────────────────
  if (isCasualShort(messages)) {
    try { return await callGroq(SYSTEM_PROMPT, flatMessages, 512) }
    catch {
      try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
      catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
    }
  }

  // ── General Hinglish / open-ended chat → Groq full tokens ──────────────
  try { return await callGroq(SYSTEM_PROMPT, flatMessages) }
  catch {
    try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
    catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
  }

// (AI call / processing)
}  // ← ये missing था

catch (error) {
  return new Response(
    JSON.stringify({ error: 'Server error' }),
    { status: 500 }
  )
  }
