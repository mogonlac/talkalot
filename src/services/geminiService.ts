/**
 * geminiService.ts
 * Handles all Gemini Flash API calls:
 * 1. generateScenario() — creates a wild, random language learning scenario
 * 2. judgeConversation() — evaluates conversation quality, returns pass/fail + ELO delta
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
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
        maxOutputTokens: 1024,
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

  const prompt = `You are a creative director for a language learning app. Generate a WILDLY creative and fun scenario.

The user's skill level is tier ${tier}/5 (1=beginner, 5=near fluent). Language: ${targetLanguage}.

Be UNPREDICTABLE. Characters can be: aliens, talking animals, historical figures, internet memes, robots, mythological gods, celebrities, fictional characters, medieval peasants, time travellers, sentient objects, random bizarre professions. Make it memorable and funny.

Rules for goalLabel: MAXIMUM 3 words. Action verb + noun. Examples: "Buy Bread", "Save World", "Order Coffee", "Escape Prison", "Find Toilet", "Propose Marriage", "Pass Customs", "Win Debate", "Sell Fish", "Survive Dinner".

Rules for openingLine: This is what the character says FIRST, immediately dropping the user into the scene. It must be in character, in ${targetLanguage}, at tier ${tier} complexity. It should naturally set up the goal without spelling it out. It ends with either a question or a clear invitation for the user to respond. Do NOT say "I'm ready" or anything meta.

Rules for voiceProfile: Pick the best fit from: "authoritative_male", "warm_female", "quirky_male", "casual_male", "energetic_female".

Rules for agentSystemPrompt: Write a full in-character system prompt. The agent must:
- Stay in character 100% of the time
- Speak ONLY in ${targetLanguage} at tier ${tier} complexity
- React naturally and realistically to what the user says
- Be fun, dynamic, and surprising
- When the user has clearly accomplished the goal, say exactly: SCENARIO_COMPLETE_PASS
- If after 6 exchanges the user has clearly failed or given up, say exactly: SCENARIO_COMPLETE_FAIL
- Never break character or mention the app

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "title": "Short catchy title (max 6 words)",
  "goalLabel": "2-3 word goal",
  "character": "Specific character description",
  "setting": "Vivid specific setting",
  "situation": "1-2 sentence description of what the user needs to do",
  "openingLine": "Character's first line in ${targetLanguage}",
  "backgroundAudioPrompt": "Short ambient sound description",
  "agentSystemPrompt": "Full system prompt for the ElevenLabs agent",
  "voiceProfile": "one of the 5 voice profile strings",
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
  if (transcript.length === 0) {
    return {
      passed: false,
      score: 0,
      feedback: "You didn't say anything! Tap 🎤 and speak next time.",
      eloChange: -5,
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
