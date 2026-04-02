import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Tool Definitions (what the AI can "do") ───────────────────────────────
const TOOLS: FunctionDeclaration[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, or facts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_code',
    description: 'Generate production-ready code for a given task.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        language: { type: SchemaType.STRING, description: 'Programming language (e.g., typescript, python)' },
        task:     { type: SchemaType.STRING, description: 'What the code should do' },
      },
      required: ['language', 'task'],
    },
  },
  {
    name: 'summarize_url',
    description: 'Fetch and summarize content from a URL.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: 'Full URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'create_todo',
    description: 'Create a structured task list or project plan.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: 'Project/task title' },
        tasks: { type: SchemaType.STRING, description: 'Comma-separated list of tasks' },
      },
      required: ['title', 'tasks'],
    },
  },
  {
    name: 'send_email_draft',
    description: 'Draft a professional email.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to:      { type: SchemaType.STRING, description: 'Recipient name or email' },
        subject: { type: SchemaType.STRING, description: 'Email subject' },
        body:    { type: SchemaType.STRING, description: 'Email body' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
]

// ── Tool Executors (actual implementations) ───────────────────────────────
async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'web_search': {
      // Real web search via Brave/SerpAPI — replace with your key
      try {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=3`,
          { headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_KEY || '' } }
        )
        if (!res.ok) return `Search failed: ${res.statusText}`
        const data = await res.json()
        const results = data.web?.results?.slice(0, 3).map((r: { title: string; description: string; url: string }) =>
          `**${r.title}**\n${r.description}\n${r.url}`
        ).join('\n\n')
        return results || 'No results found'
      } catch {
        return `Simulated search result for: "${args.query}" — Brave API key needed for real search.`
      }
    }

    case 'generate_code': {
      // This tool's output will be processed by Gemini itself in the next turn
      return `Generating ${args.language} code for: ${args.task}`
    }

    case 'summarize_url': {
      try {
        const res = await fetch(args.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        })
        const html = await res.text()
        // Strip HTML tags
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000)
        return `Content from ${args.url}:\n${text}`
      } catch {
        return `Could not fetch URL: ${args.url}`
      }
    }

    case 'create_todo': {
      const tasks = args.tasks.split(',').map((t, i) => `${i + 1}. ${t.trim()}`).join('\n')
      return `**Todo: ${args.title}**\n${tasks}`
    }

    case 'send_email_draft': {
      return `**Email Draft:**\nTo: ${args.to}\nSubject: ${args.subject}\n\n${args.body}`
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ── POST handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { prompt, messages = [] }: {
      prompt: string
      messages?: { role: string; content: string }[]
    } = await req.json()

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are Grozl Agent — an AI that can take REAL ACTIONS.
You have access to tools: web_search, generate_code, summarize_url, create_todo, send_email_draft.
When a user asks you to DO something (not just explain), USE the tools.
After getting tool results, provide a complete, helpful response.`,
      tools: [{ functionDeclarations: TOOLS }],
    })

    const history = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })

    // Step 1: Send prompt, see if model wants to call a tool
    let response = await chat.sendMessage(prompt)
    const steps: { tool: string; args: Record<string, string>; result: string }[] = []

    // Step 2: Agentic loop — keep executing tools until done
    let iterations = 0
    while (iterations < 5) {
      iterations++
      const candidate = response.response.candidates?.[0]
      if (!candidate) break

      // Check for function calls
      const functionCall = candidate.content.parts.find(p => p.functionCall)?.functionCall
      if (!functionCall) break // Model gave a text response — done!

      // Execute the tool
      const toolResult = await executeTool(
        functionCall.name,
        (functionCall.args as Record<string, string>) || {}
      )

      steps.push({
        tool: functionCall.name,
        args: (functionCall.args as Record<string, string>) || {},
        result: toolResult,
      })

      // Feed result back to model
      response = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: { content: toolResult },
        },
      }])
    }

    // Get final text response
    const finalText = response.response.text()

    return NextResponse.json({
      response: finalText,
      steps, // frontend can show "Actions taken" UI
    })
  } catch (err) {
    return NextResponse.json({ error: `Agent failed: ${err}` }, { status: 500 })
  }
        }
        
