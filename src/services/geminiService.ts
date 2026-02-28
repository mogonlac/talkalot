/**
 * geminiService.ts
 * Handles all Gemini Flash API calls:
 * 1. generateScenario() — creates a wild, random language learning scenario
 * 2. judgeConversation() — evaluates the user's conversation quality and returns pass/fail + ELO delta
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface GeneratedScenario {
  id: string;
  title: string;
  character: string;         // e.g. "The President of France"
  setting: string;           // e.g. "The Élysée Palace press room"
  situation: string;         // What the user needs to accomplish
  backgroundAudioPrompt: string; // Description for ElevenLabs sound generation
  agentSystemPrompt: string; // Full system prompt to send to ElevenLabs agent
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  language: string;
  xpReward: number;          // XP for a clean pass
}

export interface JudgmentResult {
  passed: boolean;
  score: number;             // 0–100 quality score
  feedback: string;          // Short, fun feedback message
  eloChange: number;         // Positive or negative
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.2,
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

/**
 * Generates a completely random, unique language learning scenario.
 * Characters can be anyone: aliens, historical figures, animals, robots, etc.
 */
export async function generateScenario(
  currentElo: number,
  targetLanguage: string = "French"
): Promise<GeneratedScenario> {
  // Map ELO to difficulty so Gemini generates appropriately complex scenarios
  const tier = eloToTier(currentElo);

  const prompt = `You are a creative director for a language learning app. Generate a WILDLY creative and fun scenario for a ${targetLanguage} learner.

The user's skill level is tier ${tier}/5 (1=total beginner, 5=near fluent).

Be UNPREDICTABLE. Characters can be: aliens, talking animals, historical figures, internet memes, robots, mythological gods, celebrities, fictional characters, random professions, bizarre situations. Make it memorable and funny.

Respond ONLY with valid JSON (no markdown, no code fences), in this exact format:
{
  "title": "Short catchy title (max 6 words)",
  "character": "Who the user is talking to (be specific and creative)",
  "setting": "Where this is happening (vivid, specific)",
  "situation": "What the user needs to accomplish in 1-2 sentences. Make it concrete and achievable in a 30-60 second conversation.",
  "backgroundAudioPrompt": "Short description of ambient sound for this scene (e.g. 'busy space station with beeping computers and distant rocket engines')",
  "agentSystemPrompt": "You are [character]. You are in [setting]. Speak ONLY in ${targetLanguage} (tier ${tier} complexity). [situation] React naturally to what the user says. If their ${targetLanguage} is correct and they accomplish the goal, end the conversation by saying exactly: SCENARIO_COMPLETE_PASS. If after 5 exchanges they have clearly failed or given up, say exactly: SCENARIO_COMPLETE_FAIL. Stay in character, be fun and reactive.",
  "difficultyTier": ${tier},
  "language": "${targetLanguage}",
  "xpReward": ${tier * 50}
}`;

  const raw = await callGemini(prompt);

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    ...parsed,
    id: `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  } as GeneratedScenario;
}

/**
 * Judges the quality of a completed conversation.
 * Returns pass/fail, a quality score, fun feedback, and the ELO change.
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
      feedback: "You didn't say anything! Try speaking next time. 🎤",
      eloChange: -10,
    };
  }

  const userLines = transcript
    .filter((m) => m.role === "user")
    .map((m) => `User: ${m.text}`)
    .join("\n");

  const agentLines = transcript
    .filter((m) => m.role === "agent")
    .map((m) => `Agent: ${m.text}`)
    .join("\n");

  const fullTranscript = transcript
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a strict but fun ${scenario.language} language teacher judging a student's conversation.

SCENARIO: ${scenario.title}
CHARACTER: ${scenario.character}
SITUATION: ${scenario.situation}
DIFFICULTY: Tier ${scenario.difficultyTier}/5
TARGET LANGUAGE: ${scenario.language}

FULL TRANSCRIPT:
${fullTranscript}

Judge the USER's ${scenario.language} responses only. Consider:
1. Did they accomplish the goal of the scenario?
2. Was their ${scenario.language} grammatically reasonable for their level?
3. Did they respond appropriately to what the character said?
4. Did the agent say SCENARIO_COMPLETE_PASS at the end?

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "passed": true or false,
  "score": 0-100,
  "feedback": "One fun sentence of feedback. Be encouraging but honest. Add an emoji.",
  "eloChange": a number between -30 and +50 based on quality (positive for pass, negative for fail)
}`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as JudgmentResult;
  } catch {
    // Fallback if Gemini fails to parse
    const passed = agentLines.includes("SCENARIO_COMPLETE_PASS");
    return {
      passed,
      score: passed ? 60 : 20,
      feedback: passed ? "Well done! 🎉" : "Keep practicing! 💪",
      eloChange: passed ? 15 : -10,
    };
  }
}

export interface ConversationMessage {
  role: "user" | "agent";
  text: string;
}

function eloToTier(elo: number): 1 | 2 | 3 | 4 | 5 {
  if (elo < 1000) return 1;
  if (elo < 1200) return 2;
  if (elo < 1400) return 3;
  if (elo < 1600) return 4;
  return 5;
}
