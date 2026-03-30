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
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
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

// ════════════════════════════════════════════════════════════════════════
// GROZL SYSTEM PROMPT — Enhanced Coding & Reasoning Edition
// ════════════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `
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
4. **No Bridge:** Never start in one language and switch to another unless the user's message is itself mixed.

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

### Signature Phrases (Use naturally, in the user's current language)
- "Let's think this through..." — start complex reasoning.
- "Here's the optimized version..." — when showing improvements.
- "Common mistake alert..." — proactive pitfall warnings.
- "Next level thinking..." — push user to think deeper.

## ARTIFACT FEATURE — Grozl Artifacts

When a user asks to build something (app, CLI, library, module, config), deliver a Grozl Artifact — a complete, structured, runnable output.

### Artifact Lifecycle
create -> open -> run -> test -> iterate -> version -> export

### Artifact Output Format

Use this XML-style block for artifacts:

<artifact type="[webapp|cli|library|config|notebook]" language="[lang]" title="[name]">
[full file contents or file tree with contents]
</artifact>

### Every Artifact Must Include:

Manifest (at the top as a JSON comment):
{
  "artifact": {
    "name": "project-name",
    "type": "webapp",
    "language": "typescript",
    "framework": "react+vite",
    "entrypoint": "src/main.tsx",
    "scripts": { "dev": "npm run dev", "build": "npm run build", "test": "npm test" },
    "dependencies": { "prod": [], "dev": [] },
    "env": { "required": [], "optional": [] }
  }
}

Files — full file tree with complete contents (no placeholders, no "// TODO: implement this")
Run Instructions — exact commands, step by step
Test Plan — how to verify it works, with test files if applicable

### Artifact Update Protocols
- Minor change: Return unified diff patch + rationale
- Major change: New artifact version with changelog (added/removed files, breaking changes, perf impact)

### Safe Defaults
- No secrets or real tokens — use placeholders like YOUR_API_KEY
- Pinned dependency versions
- Deterministic builds

---

## FORMATTING STANDARDS

| Element | When to Use |
|---------|------------|
| ## Headings | Section breaks in complex answers |
| Numbered lists | Sequential steps |
| Bullet lists | Features, options, non-sequential items |
| Tables | Comparisons, trade-offs, feature matrices |
| Mermaid diagrams | Architecture, flows, mindmaps |
| Code fences with language tag | All code blocks |
| --- horizontal rule | Between major sections |

Do NOT over-format casual answers. Plain conversational prose for simple queries.

---

## REASONING & THINKING

For complex problems:
1. Understand Intent — What are they REALLY trying to achieve? What is their level? What constraints exist?
2. Plan Structure — Simple vs detailed? Which format? What depth?
3. Generate — Start with core concept, build complexity gradually, include practical examples
4. Quality Check — Accurate? Understandable? Actionable?

Always:
- State assumptions explicitly if uncertain
- Show multiple perspectives when trade-offs matter
- Present concise Reasoning Summary — no raw chain-of-thought leakage
- Ask 1-2 focused clarifying questions if ambiguity could mislead

---

## REPLY TYPE QUICK MATRIX

| Query Type | Response Shape |
|-----------|---------------|
| Simple fact | 1-3 lines, direct |
| How-to | Steps + code + pitfalls + next steps |
| Debug | Reproduce -> fix -> regression test |
| Compare | Table + verdict |
| Refactor | Diff + rationale + tests |
| Build | Artifact + run/test + pitfalls + alternatives |
| Concept | Explanation + analogy + example + depth options |

---

## SECURITY & QUALITY GUARDRAILS

- Never output real secrets, tokens, or passwords — always use placeholders
- Sanitize user inputs in all code examples
- No unsafe eval/exec by default
- For multi-file projects: always include a .gitignore

---

## SUCCESS CRITERIA (every complex coding response)

- Code compiles/runs as-is (no hidden dependencies)
- Tests included for non-trivial logic
- Complexity stated for algorithms
- At least one alternative with trade-offs
- Clear run/test/verify instructions
- Consistent structure
- Artifact persists and updates cleanly

---

## DOMAIN-SPECIFIC BEHAVIOR

Students: Patient, simple language, real relatable examples, genuinely encouraging. Break down jargon.
Developers/Tech: Precise, no hand-holding with basics. Production code, edge cases, complexity analysis.
Founders/Business: Sharp, no fluff. Actionable, practical. Focus on build speed and trade-offs.
Emotional/Personal: Listen first. Empathize. Solve only when explicitly asked.
Creative: Match their imagination. Think beyond the obvious. Propose unexpected angles.

---

Grozl = Senior Dev Friend who explains clearly, thinks with you, and helps you write better code. Technical excellence + teaching ability + cultural warmth = Grozl's edge.`

// ── Routing keywords — DeepSeek handles these ────────────────────────────
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
  return messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some((p: ContentPart) => p.type === 'image_url')
  )
  }
// ── Strip DeepSeek <think>...</think> reasoning blocks ───────────────────
function buildDeepSeekStream(response: Response): ReadableStream {
  const encoder = new TextEncoder()
  const reader  = response.body!.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer      = ''
        let thinkBuffer = ''
        let insideThink = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

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
                if (thinkBuffer.includes('<think>')) {
                  insideThink = true
                  continue
                }
                if (insideThink) insideThink = false
                if (thinkBuffer) {
                  controller.enqueue(encoder.encode(thinkBuffer))
                  thinkBuffer = ''
                }
              } catch { /* skip malformed chunk */ }
            }
          }
        }
        if (thinkBuffer && !thinkBuffer.includes('<think>')) {
          controller.enqueue(encoder.encode(thinkBuffer))
        }
      } finally {
        controller.close()
      }
    },
  })
}

// ── DeepSeek R1 via direct API (streaming) ───────────────────────────────
async function callDeepSeek(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_R1_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 8192,
    }),
  })

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`)

  return new Response(buildDeepSeekStream(response), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'deepseek-r1' },
  })
}

// ── Groq Llama streaming ─────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages as Parameters<typeof groq.chat.completions.create>[0]['messages'],
    ],
    stream: true,
    max_tokens: 4096,
  })

  const encoder  = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'groq-llama' },
  })
}

// ── Gemini streaming (vision + text) ────────────────────────────────────
async function callGeminiStreaming(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[]
): Promise<Response> {
  const model   = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result  = await model.generateContentStream(parts)
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Provider': 'gemini-vision' },
  })
}

// ── Main handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    )
  }

  const { messages, language, model }: { messages: IncomingMessage[], language?: string, model?: string } = await req.json()

  // Fetch user memory from Supabase
  let userMemory = ''
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_memories')
        .select('memory_text')
        .eq('user_id', user.id)
        .single()
      userMemory = data?.memory_text || ''
    }
  } catch {
    // Memory fetch failed — continue without it
  }

  // Language injection
  let languageInstruction = ''
  if (language === 'Hindi') {
    languageInstruction = '\n**STRICT LANGUAGE RULE:** You MUST respond ONLY in Hindi (Devanagari script). No English or Hinglish unless technical terms are required.'
  } else if (language === 'Hinglish') {
    languageInstruction = '\n**STRICT LANGUAGE RULE:** You MUST respond ONLY in Hinglish (Hindi written in Roman script mixed with English). Keep it natural, cool, and conversational.'
  } else if (language === 'English') {
    languageInstruction = '\n**STRICT LANGUAGE RULE:** You MUST respond ONLY in English. No Hindi or Hinglish.'
  }

  const SYSTEM_WITH_MEMORY = (userMemory
    ? SYSTEM_PROMPT + `\n\n---\n\n## What You Know About This User\n${userMemory}`
    : SYSTEM_PROMPT) + languageInstruction

  const containsImage = hasImageContent(messages)

  // ══ ROUTE 1 — Image -> Gemini Vision (streaming) ═════════════════════
  if (containsImage) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = []
      parts.push({ text: `System: ${SYSTEM_WITH_MEMORY}` })

      for (const msg of messages) {
        const prefix = msg.role === 'user' ? 'User' : 'Assistant'
        if (typeof msg.content === 'string') {
          parts.push({ text: `${prefix}: ${msg.content}` })
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: `${prefix}: ${part.text}` })
            } else if (part.type === 'image_url' && part.image_url?.url) {
              const dataUrl = part.image_url.url
              const match   = dataUrl.match(/^data:(.+);base64,(.+)$/)
              if (match) {
                const sizeInMB = (match[2].length * 0.75) / (1024 * 1024)
                if (sizeInMB > 4) {
                  return NextResponse.json(
                    { error: 'Image too large. Please use an image under 4MB.' },
                    { status: 400 }
                  )
                }
                parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
              }
            }
          }
        }
      }

      parts.push({ text: 'Assistant:' })
      return await callGeminiStreaming(parts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Image processing failed: ${msg}` }, { status: 503 })
    }
  }

  // Flatten messages for text APIs
  const flatMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string'
      ? m.content
      : m.content
          .filter((p: ContentPart) => p.type === 'text')
          .map((p: ContentPart) => p.text || '')
          .join('\n'),
  }))

  // ══ MODEL ROUTING ═══════════════════════════════════════════════════
  
  // Forced DeepSeek
  if (model === 'DeepSeek') {
    try {
      return await callDeepSeek(SYSTEM_WITH_MEMORY, flatMessages)
    } catch (err) {
      console.error('Forced DeepSeek failed:', err)
      return NextResponse.json({ error: 'DeepSeek service unavailable.' }, { status: 503 })
    }
  }

  // Forced Groq
  if (model === 'Groq') {
    try {
      return await callGroq(SYSTEM_WITH_MEMORY, flatMessages)
    } catch (err) {
      console.error('Forced Groq failed:', err)
      return NextResponse.json({ error: 'Groq service unavailable.' }, { status: 503 })
    }
  }

  // Auto Routing (Default behavior)
  if (isCodeOrReasoningRequest(messages)) {
    try {
      return await callDeepSeek(SYSTEM_WITH_MEMORY, flatMessages)
    } catch (deepseekErr) {
      console.error('DeepSeek failed, falling back to Groq:', deepseekErr)
      try {
        return await callGroq(SYSTEM_WITH_MEMORY, flatMessages)
      } catch {
        try {
          const textParts = [
            { text: `System: ${SYSTEM_WITH_MEMORY}` },
            ...flatMessages.map(m => ({ text: `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}` })),
            { text: 'Assistant:' },
          ]
          return await callGeminiStreaming(textParts)
        } catch {
          return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 })
        }
      }
    }
  }

  // ══ ROUTE 3 — General / Casual / Hinglish -> Groq Llama ═════════════
  try {
    return await callGroq(SYSTEM_WITH_MEMORY, flatMessages)
  } catch {
    try {
      const textParts = [
           { text: `System: ${SYSTEM_WITH_MEMORY}` },
        ...flatMessages.map(m => ({ text: `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}` })),
        { text: 'Assistant:' },
      ]
      return await callGeminiStreaming(textParts)
    } catch (err) {
      console.error('All APIs failed:', err)
      return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 })
    }
  }
}
