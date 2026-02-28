import { SEED_SCENARIOS } from '@/data/scenarios'

// In-memory cache: scenarioId -> { bg, avatar }
const cache: Record<string, { bg: string | null; avatar: string | null }> = {}
const inProgress: Record<string, boolean> = {}

// Static emoji/icon avatars for each scenario - instant, no API needed
const SCENARIO_AVATARS: Record<string, string> = {
  '1': '👨‍🍳',  // Italian waiter
  '2': '✈️',   // Airline check-in
  '3': '💼',   // HR manager
  '4': '👨‍⚕️',  // Doctor
  '5': '🛍️',   // Retail worker
  '6': '🏘️',   // Neighbour
  '7': '👔',   // Office manager
  '8': '🏨',   // Hotel receptionist
  '9': '💻',   // Tech support
  '10': '☕',  // Date at cafe
  '11': '🏠',  // Estate agent
  '12': '🏥',  // Emergency nurse
}

// Gradient backgrounds for each scenario
const SCENARIO_GRADIENTS: Record<string, string> = {
  '1': 'linear-gradient(135deg, #ff6b35, #f7931e)',  // Warm Italian
  '2': 'linear-gradient(135deg, #4facfe, #00f2fe)',  // Sky blue airport
  '3': 'linear-gradient(135deg, #667eea, #764ba2)',  // Corporate purple
  '4': 'linear-gradient(135deg, #20e3b2, #29ffc6)',  // Medical teal
  '5': 'linear-gradient(135deg, #fa709a, #fee140)',  // Cheerful retail
  '6': 'linear-gradient(135deg, #30cfd0, #330867)',  // Friendly green/blue
  '7': 'linear-gradient(135deg, #a8edea, #fed6e3)',  // Professional pastel
  '8': 'linear-gradient(135deg, #ffd89b, #19547b)',  // Luxury gold
  '9': 'linear-gradient(135deg, #13547a, #80d0c7)',  // Tech blue
  '10': 'linear-gradient(135deg, #fccb90, #d57eeb)', // Romantic pink
  '11': 'linear-gradient(135deg, #ff9a56, #ff6a88)', // Energetic orange
  '12': 'linear-gradient(135deg, #e0c3fc, #8ec5fc)', // Hospital calm blue
}

export async function preloadScenarioImages(scenarioId: string): Promise<void> {
  if (cache[scenarioId] || inProgress[scenarioId]) return
  
  // Instantly return emoji avatar and gradient background - no API needed!
  cache[scenarioId] = {
    bg: SCENARIO_GRADIENTS[scenarioId] || 'linear-gradient(135deg, #667eea, #764ba2)',
    avatar: SCENARIO_AVATARS[scenarioId] || '🎭'
  }
}

export function getScenarioImages(scenarioId: string): { bg: string | null; avatar: string | null } | null {
  // Auto-generate on first access if not cached
  if (!cache[scenarioId]) {
    cache[scenarioId] = {
      bg: SCENARIO_GRADIENTS[scenarioId] || 'linear-gradient(135deg, #667eea, #764ba2)',
      avatar: SCENARIO_AVATARS[scenarioId] || '🎭'
    }
  }
  return cache[scenarioId]
}

export function isScenarioLoaded(scenarioId: string): boolean {
  return !!cache[scenarioId]
}

// Pre-generate ALL scenario images in the background (called on login)
export async function preloadAllImages(): Promise<void> {
  // Generate 1 at a time to avoid rate limiting from Pollinations.ai
  for (const scenario of SEED_SCENARIOS) {
    await preloadScenarioImages(scenario.id)
    // Add delay between scenarios
    await delay(1000)
  }
}
