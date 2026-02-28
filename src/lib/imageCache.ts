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

const SCENARIO_BG_PROMPTS: Record<string, string> = {
  '1': 'Flat vector illustration of a cozy Italian restaurant interior, geometric tables with checkered tablecloths, warm orange and red color palette, Duolingo style, minimal flat design, no people, bright and cheerful',
  '2': 'Flat vector illustration of a modern airport check-in hall, geometric counters, blue and white color palette, Duolingo style, minimal flat design, no people, bright lighting',
  '3': 'Flat vector illustration of a sleek corporate office meeting room, geometric furniture, violet and white color palette, Duolingo style, minimal flat design, no people, professional',
  '4': 'Flat vector illustration of a clean doctors surgery waiting room, geometric chairs, teal and white color palette, Duolingo style, minimal flat design, no people, calm and friendly',
  '5': 'Flat vector illustration of a bright retail store interior, geometric shelves and products, pink and white color palette, Duolingo style, minimal flat design, no people, cheerful',
  '6': 'Flat vector illustration of a modern apartment building hallway, geometric doors and plants, green and white color palette, Duolingo style, minimal flat design, no people, friendly',
  '7': 'Flat vector illustration of a bright office with a desk and city view through window, violet and yellow color palette, Duolingo style, minimal flat design, no people, professional',
  '8': 'Flat vector illustration of a luxury hotel lobby with geometric furniture, gold and white color palette, Duolingo style, minimal flat design, no people, elegant',
  '9': 'Flat vector illustration of a tech support call centre with geometric computers and headsets, blue and teal color palette, Duolingo style, minimal flat design, no people',
  '10': 'Flat vector illustration of a cozy cafe perfect for a date, geometric tables and coffee cups, warm pink and amber color palette, Duolingo style, minimal flat design, no people, romantic',
  '11': 'Flat vector illustration of a bright modern apartment interior for viewing, geometric furniture, orange and white color palette, Duolingo style, minimal flat design, no people',
  '12': 'Flat vector illustration of a hospital emergency waiting room, geometric chairs and signs, teal and white color palette, Duolingo style, minimal flat design, no people, clean',
}

const SCENARIO_AVATAR_PROMPTS: Record<string, string> = {
  '1': 'Flat vector illustration portrait of an Italian male waiter in his 40s, wearing white shirt and apron, geometric flat style, Duolingo character design, solid color blocks, no gradients, expressive face, white background',
  '2': 'Flat vector illustration portrait of a professional female airline check-in agent, wearing uniform and headset, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '3': 'Flat vector illustration portrait of a sharp male HR manager in his 40s, wearing business suit, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '4': 'Flat vector illustration portrait of a friendly male doctor of South Asian appearance, wearing white coat and stethoscope, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '5': 'Flat vector illustration portrait of a bored female retail worker, wearing store uniform, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '6': 'Flat vector illustration portrait of a cheerful male Australian neighbour in his 30s, wearing casual t-shirt, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '7': 'Flat vector illustration portrait of a professional female manager in her 40s, wearing smart business attire, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '8': 'Flat vector illustration portrait of a polite male hotel receptionist of Spanish appearance, wearing hotel uniform, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '9': 'Flat vector illustration portrait of an enthusiastic male tech support agent, wearing headset, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '10': 'Flat vector illustration portrait of an attractive person on a first date, wearing casual smart outfit, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '11': 'Flat vector illustration portrait of an energetic female estate agent, wearing blazer, holding clipboard, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
  '12': 'Flat vector illustration portrait of a no-nonsense female nurse in scrubs, geometric flat style, Duolingo character design, solid color blocks, no gradients, white background',
}

export async function preloadScenarioImages(scenarioId: string): Promise<void> {
  if (cache[scenarioId] || inProgress[scenarioId]) return
  const scenario = SEED_SCENARIOS.find(s => s.id === scenarioId)
  if (!scenario) return

  inProgress[scenarioId] = true
  const bgPrompt = SCENARIO_BG_PROMPTS[scenarioId] || `Flat vector illustration of a ${scenario.category} scene, Duolingo style, bright colors, minimal flat design, no people, geometric shapes`
  const avatarPrompt = SCENARIO_AVATAR_PROMPTS[scenarioId] || `Flat vector illustration portrait of ${scenario.character_name}, ${scenario.character_role}, Duolingo character design, geometric flat style, solid color blocks, white background`

  const [bg, avatar] = await Promise.all([
    generateImage(bgPrompt),
    generateImage(avatarPrompt)
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
