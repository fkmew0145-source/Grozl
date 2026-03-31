export interface GrozlSettings {
  language: 'english' | 'hindi' | 'hinglish' | 'spanish' | 'french' | 'arabic' | 'bengali' | 'portuguese' | 'russian' | 'urdu' | 'indonesian' | 'german' | 'japanese' | 'chinese' | 'turkish'
  appearance: 'light' | 'dark' | 'system'
  fontSize: number          // 12–20, default 15
  voiceLanguage: string     // e.g. 'hi-IN', 'en-US'
  defaultModel: 'auto' | 'deepseek' | 'groq' | 'gemini'
  saveHistory: boolean
  improveModel: boolean
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

const KEY = 'grozl_settings'

export function loadSettings(): GrozlSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: GrozlSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* ignore */ }
}

export function patchSettings(patch: Partial<GrozlSettings>): GrozlSettings {
  const current = loadSettings()
  const updated  = { ...current, ...patch }
  saveSettings(updated)
  return updated
}
