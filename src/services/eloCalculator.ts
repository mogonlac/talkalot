/**
 * ELO Calculator for Language Tutor
 *
 * Uses a simplified ELO system where each scenario has an implied rating
 * based on its difficulty tier. The K-factor controls how much a single
 * result can shift the user's rating.
 */

const K_FACTOR = 32;
const TIER_TO_ELO: Record<number, number> = {
  1: 800,
  2: 1000,
  3: 1200,
  4: 1400,
  5: 1600,
};

/**
 * Calculates the expected probability of the player winning against
 * an opponent with the given rating.
 */
function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculates a new ELO score after a conversation attempt.
 *
 * @param currentElo   - The user's current ELO rating
 * @param difficultyTier - The scenario's difficulty tier (1–5)
 * @param success      - true if the user succeeded, false if they failed
 * @returns            - The updated ELO rating (minimum 100)
 */
export function calculateNewElo(
  currentElo: number,
  difficultyTier: number,
  success: boolean
): number {
  const scenarioElo = TIER_TO_ELO[difficultyTier] ?? 1000;
  const expected = expectedScore(currentElo, scenarioElo);
  const actual = success ? 1 : 0;

  const newElo = Math.round(currentElo + K_FACTOR * (actual - expected));

  // Enforce a floor so ELO never goes below 100
  return Math.max(100, newElo);
}
