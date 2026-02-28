export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  elevenLabsAgentId: string;
  environmentalAudio: string;
  language: string;
  eloRange: { min: number; max: number };
}

export const scenarios: Scenario[] = [
  {
    id: "french-barista",
    title: "French Barista",
    description:
      "You walk into a busy Parisian café. Order a coffee and a croissant from the barista in French. Keep it simple — greetings, ordering, and paying.",
    difficultyTier: 1,
    elevenLabsAgentId: "agent_french_barista_placeholder",
    environmentalAudio: "cafe_ambience.mp3",
    language: "French",
    eloRange: { min: 0, max: 1099 },
  },
  {
    id: "tokyo-train",
    title: "Tokyo Train Station",
    description:
      "You're lost at Shinjuku Station. Ask a station attendant in Japanese for directions to the Yamanote Line platform and confirm the departure time.",
    difficultyTier: 2,
    elevenLabsAgentId: "agent_tokyo_train_placeholder",
    environmentalAudio: "train_station_ambience.mp3",
    language: "Japanese",
    eloRange: { min: 1000, max: 1199 },
  },
  {
    id: "spanish-market",
    title: "Madrid Market Negotiation",
    description:
      "You're at a local market in Madrid. Negotiate the price of fresh produce with the vendor in Spanish. Try to get a discount by buying in bulk.",
    difficultyTier: 3,
    elevenLabsAgentId: "agent_madrid_market_placeholder",
    environmentalAudio: "market_ambience.mp3",
    language: "Spanish",
    eloRange: { min: 1100, max: 1299 },
  },
  {
    id: "german-job-interview",
    title: "German Job Interview",
    description:
      "You're interviewing for a software engineering role at a Berlin startup. Answer technical and personal questions confidently in German.",
    difficultyTier: 4,
    elevenLabsAgentId: "agent_german_interview_placeholder",
    environmentalAudio: "office_ambience.mp3",
    language: "German",
    eloRange: { min: 1200, max: 1399 },
  },
  {
    id: "mandarin-business",
    title: "Shanghai Business Dinner",
    description:
      "You're at a formal business dinner in Shanghai. Navigate complex social etiquette, discuss a partnership proposal, and toast your hosts — all in Mandarin.",
    difficultyTier: 5,
    elevenLabsAgentId: "agent_shanghai_business_placeholder",
    environmentalAudio: "restaurant_ambience.mp3",
    language: "Mandarin",
    eloRange: { min: 1300, max: 9999 },
  },
];

/**
 * Returns the best-matching scenario for a given ELO score.
 * Picks the scenario whose eloRange contains the score.
 * Falls back to the closest tier if no exact match.
 */
export function getScenarioForElo(elo: number): Scenario {
  const match = scenarios.find(
    (s) => elo >= s.eloRange.min && elo <= s.eloRange.max
  );
  if (match) return match;

  // Fallback: return highest tier scenario for very high ELO
  return scenarios[scenarios.length - 1];
}
