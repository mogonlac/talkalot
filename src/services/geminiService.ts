/**
 * geminiService.ts
 * Handles all Gemini Flash API calls:
 * 1. generateScenario() — creates a wild, random language learning scenario
 * 2. judgeConversation() — evaluates conversation quality, returns pass/fail + ELO delta
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─── Voice profiles ────────────────────────────────────────────────────────
// Maps to the 5 ElevenLabs agents. Gemini picks the best fit per scenario.
export type VoiceProfile =
  | "authoritative_male"   // Agent 1: presidents, villains, professors
  | "warm_female"          // Agent 2: baristas, chefs, artists
  | "quirky_male"          // Agent 3: aliens, robots, weirdos
  | "casual_male"          // Agent 4: tourists, friends, vendors
  | "energetic_female";    // Agent 5: pop stars, guides, athletes

// ─── Types ─────────────────────────────────────────────────────────────────
export interface GeneratedScenario {
  id: string;
  title: string;
  goalLabel: string;          // 2-3 words shown at top: "Buy Bread", "Save World"
  character: string;          // e.g. "A confused medieval peasant"
  setting: string;            // e.g. "A muddy village market, 1347"
  situation: string;          // Full description for the card
  openingLine: string;        // What the agent says FIRST to kick off the scene
  backgroundAudioPrompt: string;
  agentSystemPrompt: string;
  voiceProfile: VoiceProfile;
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  language: string;
  xpReward: number;
}

export interface JudgmentResult {
  passed: boolean;
  score: number;        // 0–100
  feedback: string;     // Short fun feedback with emoji
  eloChange: number;    // Positive or negative integer
}

export interface ConversationMessage {
  role: "user" | "agent";
  text: string;
}

// ─── Internal helpers ───────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function eloToTier(elo: number): 1 | 2 | 3 | 4 | 5 {
  if (elo < 1000) return 1;
  if (elo < 1200) return 2;
  if (elo < 1400) return 3;
  if (elo < 1600) return 4;
  return 5;
}

// ─── Scenario generation ────────────────────────────────────────────────────
/**
 * Generates a completely random, unique language learning scenario.
 * Characters can be anyone: aliens, historical figures, animals, robots, etc.
 * Each scenario includes a 2-3 word goal label and a dynamic opening line.
 */
export async function generateScenario(
  currentElo: number,
  targetLanguage: string = "English"
): Promise<GeneratedScenario> {
  const tier = eloToTier(currentElo);

  // Random pools for variability
  const characters = [
    "a grumpy old shopkeeper", "a nervous flight attendant", "a strict customs officer",
    "a distracted barista", "an overly enthusiastic tour guide", "a tired taxi driver",
    "a confused hotel receptionist", "a chatty market vendor", "a forgetful waiter",
    "a suspicious landlord", "an impatient train conductor", "a friendly pharmacist",
    "a bored museum guard", "a dramatic hairdresser", "a clumsy chef",
    "a nosy neighbor", "a strict librarian", "a cheerful street food seller",
  ];
  const settings = [
    "a busy café", "an airport check-in desk", "a street market stall",
    "a hotel reception", "a train carriage", "a pharmacy counter",
    "a restaurant table", "a taxi", "a museum", "a hair salon",
    "a supermarket checkout", "a post office", "a bus stop", "a doctor's waiting room",
  ];
  const goals = [
    ["Order Coffee", "order a coffee exactly how you want it"],
    ["Buy Ticket", "buy the right train/bus ticket"],
    ["Check In", "check into your hotel room"],
    ["Find Directions", "get directions to where you need to go"],
    ["Buy Medicine", "describe your symptoms and buy the right medicine"],
    ["Order Food", "order a meal from the menu"],
    ["Pay Bill", "pay the bill and sort out a mistake on it"],
    ["Book Room", "book a room for the right dates"],
    ["Get Refund", "return a broken item and get your money back"],
    ["Ask for Help", "explain you're lost and get help"],
    ["Buy Souvenir", "haggle and buy a souvenir"],
    ["Catch Taxi", "tell the driver where to go and negotiate price"],
  ];

  const character = characters[Math.floor(Math.random() * characters.length)];
  const setting = settings[Math.floor(Math.random() * settings.length)];
  const [goalLabel, goalDesc] = goals[Math.floor(Math.random() * goals.length)];

  const prompt = `You are generating a language learning roleplay scenario. Keep it SHORT and SIMPLE.

Language: ${targetLanguage}. Difficulty tier: ${tier}/5 (1=beginner uses simple words, 5=near-fluent uses natural complex speech).

The scenario:
- Character: ${character}
- Setting: ${setting}  
- User goal: ${goalDesc}

Rules for openingLine: The character speaks FIRST in ${targetLanguage}. One or two short sentences. Natural, in-character, sets up the scene. Ends with a question or prompt for the user. Tier ${tier} vocabulary complexity.

Rules for agentSystemPrompt: Short, clear instructions. The agent must:
- Play ${character} at ${setting}
- Speak ONLY in ${targetLanguage}, tier ${tier} difficulty (tier 1 = very simple short sentences, tier 5 = natural fluent speech)
- Be realistic and stay in character
- Keep responses SHORT (1-3 sentences max)
- When the user successfully completes "${goalDesc}", end with: SCENARIO_COMPLETE_PASS
- If the user clearly gives up or fails after several attempts, end with: SCENARIO_COMPLETE_FAIL
- Never mention the app or break character

Rules for voiceProfile: pick best fit from "authoritative_male", "warm_female", "quirky_male", "casual_male", "energetic_female".

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "title": "3-5 word catchy title",
  "goalLabel": "${goalLabel}",
  "character": "${character} at ${setting}",
  "setting": "${setting}",
  "situation": "One sentence: what the user needs to do.",
  "openingLine": "Character's opening line in ${targetLanguage}",
  "backgroundAudioPrompt": "2-3 word ambient sound",
  "agentSystemPrompt": "System prompt for the agent",
  "voiceProfile": "chosen voice profile",
  "difficultyTier": ${tier},
  "language": "${targetLanguage}",
  "xpReward": ${tier * 50}
}`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    ...parsed,
    id: `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  } as GeneratedScenario;
}

// ─── Conversation judgment ──────────────────────────────────────────────────
/**
 * Judges the quality of a completed conversation.
 * Returns pass/fail, quality score, fun feedback, and ELO change.
 */
export async function judgeConversation(
  scenario: GeneratedScenario,
  transcript: ConversationMessage[],
  currentElo: number
): Promise<JudgmentResult> {
  const userMessages = transcript.filter((m) => m.role === "user");
  if (userMessages.length === 0) {
    return {
      passed: false,
      score: 0,
      feedback: "You didn't get a chance to speak! Try again 🎙️",
      eloChange: 0,
    };
  }

  const fullTranscript = transcript
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.text}`)
    .join("\n");

  const agentText = transcript
    .filter((m) => m.role === "agent")
    .map((m) => m.text)
    .join(" ");

  const autoPass = agentText.includes("SCENARIO_COMPLETE_PASS");
  const autoFail = agentText.includes("SCENARIO_COMPLETE_FAIL");

  const prompt = `You are a strict but encouraging ${scenario.language} language teacher judging a student's conversation.

SCENARIO: ${scenario.title}
GOAL: ${scenario.goalLabel}
CHARACTER: ${scenario.character}
SITUATION: ${scenario.situation}
DIFFICULTY: Tier ${scenario.difficultyTier}/5
LANGUAGE: ${scenario.language}
${autoPass ? "NOTE: The agent confirmed SCENARIO_COMPLETE_PASS." : ""}
${autoFail ? "NOTE: The agent confirmed SCENARIO_COMPLETE_FAIL." : ""}

FULL TRANSCRIPT:
${fullTranscript}

Judge the USER's responses only. Consider:
1. Did they accomplish the goal ("${scenario.goalLabel}")?
2. Was their ${scenario.language} reasonable for tier ${scenario.difficultyTier}?
3. Did they respond appropriately to what the character said?

Give a fun, specific one-sentence feedback. Reference the scenario. Add an emoji.
ELO change: +10 to +40 for pass (more for harder tiers and better quality), -5 to -25 for fail.

Respond ONLY with valid JSON (no markdown):
{
  "passed": true or false,
  "score": 0-100,
  "feedback": "One fun specific sentence with emoji",
  "eloChange": integer
}`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as JudgmentResult;
  } catch {
    return {
      passed: autoPass,
      score: autoPass ? 65 : 25,
      feedback: autoPass ? "Nice work! 🎉" : "Keep at it! 💪",
      eloChange: autoPass ? 15 : -10,
    };
  }
}
