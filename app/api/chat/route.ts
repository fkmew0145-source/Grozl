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
async function callGroq(systemPrompt: string, messages: { role: string; content: string }[]): Promise<Response> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages as Parameters<typeof groq.chat.completions.create>[0]['messages']],
    stream: true, max_tokens: 4096,
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

// ── Main handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  const {
    messages,
    model: modelPref = 'auto',
    personalization,
  }: {
    messages: IncomingMessage[]
    model?: string
    personalization?: PersonalizationPayload
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

  // Build complete system prompt
  const SYSTEM_PROMPT =
    BASE_SYSTEM_PROMPT +
    buildPersonalizationBlock(personalization) +
    (userMemory ? `\n\n---\n\n## What You Know About This User\n${userMemory}` : '')

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
    try { return await callGroq(SYSTEM_PROMPT, flatMessages) }
    catch { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)).catch(() => NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 })) }
  }

  if (modelPref === 'gemini') {
    try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
    catch { return NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 }) }
  }

  // ══ AUTO ROUTING (default) ════════════════════════════════════════════
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

  // General / Casual / Hinglish → Groq Llama
  try { return await callGroq(SYSTEM_PROMPT, flatMessages) }
  catch {
    try { return await callGeminiStreaming(toGeminiTextParts(SYSTEM_PROMPT, flatMessages)) }
    catch { return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 }) }
  }
                                                   }
    
