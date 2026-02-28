/**
 * eloCalculator.ts
 * ELO rating system for the language tutor.
 * Now accepts a quality score from Gemini's judgment for more nuanced ELO shifts.
 */

export const STARTING_ELO = 1000;
const ELO_FLOOR = 100;

/**
 * Calculates new ELO based on Gemini's judgment result.
 * Uses the eloChange from Gemini directly, with clamping for safety.
 *
 * @param currentElo  - User's current ELO
 * @param eloChange   - Raw ELO delta from Gemini judgment (-50 to +50)
 * @returns           - New ELO (minimum ELO_FLOOR)
 */
export function applyEloChange(currentElo: number, eloChange: number): number {
  // Clamp the change to prevent runaway values
  const clamped = Math.max(-50, Math.min(50, eloChange));
  return Math.max(ELO_FLOOR, currentElo + clamped);
}

/**
 * Returns an XP label string for display based on ELO change.
 */
export function formatEloChange(eloChange: number): string {
  if (eloChange > 0) return `+${eloChange} XP`;
  return `${eloChange} XP`;
}

/**
 * Returns a tier label (1–5) for a given ELO score.
 */
export function eloToTier(elo: number): 1 | 2 | 3 | 4 | 5 {
  if (elo < 1000) return 1;
  if (elo < 1200) return 2;
  if (elo < 1400) return 3;
  if (elo < 1600) return 4;
  return 5;
}

/**
 * Returns a human-readable level label for display.
 */
export function eloToLabel(elo: number): string {
  if (elo < 1000) return "Beginner";
  if (elo < 1200) return "Elementary";
  if (elo < 1400) return "Intermediate";
  if (elo < 1600) return "Advanced";
  return "Fluent";
}
