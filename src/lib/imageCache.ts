import { SEED_SCENARIOS } from '@/data/scenarios'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// In-memory cache: scenarioId -> { bg, avatar }
const cache: Record<string, { bg: string | null; avatar: string | null }> = {}
const inProgress: Record<string, boolean> = {}

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 }
        })
      }
    )
    const data = await response.json()
    const b64 = data.predictions?.[0]?.bytesBase64Encoded
    if (b64) return `data:image/png;base64,${b64}`
    return null
  } catch {
    return null
  }
}

export async function preloadScenarioImages(scenarioId: string): Promise<void> {
  if (cache[scenarioId] || inProgress[scenarioId]) return
  const scenario = SEED_SCENARIOS.find(s => s.id === scenarioId)
  if (!scenario) return

  inProgress[scenarioId] = true
  const [bg, avatar] = await Promise.all([
    generateImage(`${scenario.context.replace('🎯 MISSION:', '').split('.')[0]}, cinematic, dark moody atmospheric lighting, photorealistic, wide angle, no people`),
    generateImage(`Portrait of ${scenario.character_name}, ${scenario.character_role}, ${scenario.character_personality}, dramatic lighting, dark background, photorealistic, close up face`)
  ])
  cache[scenarioId] = { bg, avatar }
  inProgress[scenarioId] = false
}

export function getScenarioImages(scenarioId: string): { bg: string | null; avatar: string | null } | null {
  return cache[scenarioId] || null
}

export function isScenarioLoaded(scenarioId: string): boolean {
  return !!cache[scenarioId]
}

// Pre-generate ALL scenario images in the background (called on login)
export async function preloadAllImages(): Promise<void> {
  // Generate 2 at a time to avoid rate limiting
  for (let i = 0; i < SEED_SCENARIOS.length; i += 2) {
    const batch = SEED_SCENARIOS.slice(i, i + 2)
    await Promise.all(batch.map(s => preloadScenarioImages(s.id)))
  }
}
