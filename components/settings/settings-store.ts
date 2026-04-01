export interface GrozlSettings {
  language: 'english' | 'hindi' | 'hinglish' | 'tamil' | 'telugu' | 'marathi' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'bengali' | 'urdu' | 'spanish' | 'french' | 'arabic' | 'portuguese' | 'russian' | 'indonesian' | 'german' | 'japanese' | 'chinese' | 'turkish'
  appearance: 'light' | 'dark' | 'system'
  fontSize: number
  voiceLanguage: string
  defaultModel: 'auto' | 'deepseek' | 'groq' | 'gemini'
  saveHistory: boolean
  improveModel: boolean
}

export interface GrozlPersonalization {
  baseTone: 'default' | 'formal' | 'casual' | 'technical' | 'concise' | 'friendly' | 'humorous'
  characteristics: string[]
  customInstructions: string
  referenceMemories: boolean
  referenceChatHistory: boolean
  nickname: string
  occupation: string
  aboutYou: string
}

export const DEFAULT_SETTINGS: GrozlSettings = {
  language:      'hinglish',
  appearance:    'system',
  fontSize:      15,
  voiceLanguage: 'hi-IN',
  defaultModel:  'auto',
  saveHistory:   true,
  improveModel:  true,
}

export const DEFAULT_PERSONALIZATION: GrozlPersonalization = {
  baseTone:             'default',
  characteristics:      [],
  customInstructions:   '',
  referenceMemories:    true,
  referenceChatHistory: true,
  nickname:             '',
  occupation:           '',
  aboutYou:             '',
}

const SETTINGS_KEY = 'grozl_settings'

// ── User-specific key helpers ─────────────────────────────────────────────
export function personalizationKey(userId?: string | null): string {
  return userId ? `grozl_personalization_${userId}` : 'grozl_personalization_guest'
}

export function profileKey(userId?: string | null): string {
  return userId ? `grozl_profile_${userId}` : 'grozl_profile_guest'
}

export function sessionsKey(userId?: string | null): string {
  return userId ? `grozl_sessions_${userId}` : 'grozl_sessions_guest'
}

export function projectsKey(userId?: string | null): string {
  return userId ? `grozl_projects_${userId}` : 'grozl_projects_guest'
}

// ── Settings ──────────────────────────────────────────────────────────────
export function loadSettings(): GrozlSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: GrozlSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function patchSettings(patch: Partial<GrozlSettings>): GrozlSettings {
  const current = loadSettings()
  const updated  = { ...current, ...patch }
  saveSettings(updated)
  return updated
}

// ── Personalization ───────────────────────────────────────────────────────
export function loadPersonalization(userId?: string | null): GrozlPersonalization {
  try {
    const raw = localStorage.getItem(personalizationKey(userId))
    if (!raw) return { ...DEFAULT_PERSONALIZATION }
    return { ...DEFAULT_PERSONALIZATION, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PERSONALIZATION }
  }
}

export function savePersonalization(p: GrozlPersonalization, userId?: string | null): void {
  try { localStorage.setItem(personalizationKey(userId), JSON.stringify(p)) } catch { /* ignore */ }
}

export function patchPersonalization(patch: Partial<GrozlPersonalization>, userId?: string | null): GrozlPersonalization {
  const current = loadPersonalization(userId)
  const updated  = { ...current, ...patch }
  savePersonalization(updated, userId)
  return updated
}

// ── Theme helper (used on app load to restore saved theme) ────────────────
export function applyTheme(appearance: GrozlSettings['appearance']) {
  const root = document.documentElement
  if (appearance === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else if (appearance === 'light') {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'normal'
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
  }
}

export function applyFontSize(size: number) {
  document.documentElement.style.setProperty('--chat-font-size', `${size}px`)
      }
