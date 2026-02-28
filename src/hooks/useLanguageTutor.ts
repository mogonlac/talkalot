/**
 * useLanguageTutor.ts
 * Single source of truth for all business logic.
 * UI components consume this hook and stay completely dumb.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  generateScenario,
  judgeConversation,
  GeneratedScenario,
  ConversationMessage,
  JudgmentResult,
  VoiceProfile,
} from "../services/geminiService";
import {
  applyEloChange,
  formatEloChange,
  eloToLabel,
  STARTING_ELO,
} from "../services/eloCalculator";

// ─── 5 Agent IDs mapped to voice profiles ──────────────────────────────────
const AGENT_MAP: Record<VoiceProfile, string> = {
  authoritative_male: import.meta.env.VITE_ELEVENLABS_AGENT_AUTHORITATIVE_MALE ?? "",
  warm_female:        import.meta.env.VITE_ELEVENLABS_AGENT_WARM_FEMALE ?? "",
  quirky_male:        import.meta.env.VITE_ELEVENLABS_AGENT_QUIRKY_MALE ?? "",
  casual_male:        import.meta.env.VITE_ELEVENLABS_AGENT_CASUAL_MALE ?? "",
  energetic_female:   import.meta.env.VITE_ELEVENLABS_AGENT_ENERGETIC_FEMALE ?? "",
};

function getAgentId(profile: VoiceProfile): string {
  return AGENT_MAP[profile] || Object.values(AGENT_MAP).find(Boolean) || "";
}

// ─── Supported languages ────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "German",
  "Japanese",
  "Mandarin",
  "Italian",
  "Portuguese",
];

// ─── State machine phases ───────────────────────────────────────────────────
export type AppPhase =
  | "loading"       // Gemini generating next scenario
  | "ready"         // Scenario ready, waiting for user
  | "talking"       // Active ElevenLabs conversation
  | "judging"       // Gemini judging the conversation
  | "result_pass"   // Showing pass result
  | "result_fail"   // Showing fail result
  | "error";        // Something went wrong

// ─── Public interface ───────────────────────────────────────────────────────
export interface TutorState {
  phase: AppPhase;
  currentElo: number;
  eloLabel: string;
  scenario: GeneratedScenario | null;
  lastResult: JudgmentResult | null;
  lastEloChange: string;
  errorMessage: string;
  isSpeaking: boolean;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  swipeNext: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useLanguageTutor(): TutorState {
  const [phase, setPhase] = useState<AppPhase>("loading");
  const [currentElo, setCurrentElo] = useState<number>(STARTING_ELO);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [lastResult, setLastResult] = useState<JudgmentResult | null>(null);
  const [lastEloChange, setLastEloChange] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("English");

  // Accumulate transcript during conversation
  const transcriptRef = useRef<ConversationMessage[]>([]);
  // Prevent double-judging on rapid disconnect events
  const judgingRef = useRef<boolean>(false);

  // ── ElevenLabs conversation hook ──────────────────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      setPhase("talking");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected");
      if (!judgingRef.current) {
        judgingRef.current = true;
        handleJudge();
      }
    },
    onMessage: (message: { message: string; source: string }) => {
      const role = message.source === "user" ? "user" : "agent";
      transcriptRef.current.push({ role, text: message.message });

      // Auto-end session if agent signals completion
      if (
        message.source !== "user" &&
        (message.message.includes("SCENARIO_COMPLETE_PASS") ||
          message.message.includes("SCENARIO_COMPLETE_FAIL"))
      ) {
        conversation.endSession().catch(console.error);
      }
    },
    onError: (error: string) => {
      console.error("[ElevenLabs] Error:", error);
      setErrorMessage(`ElevenLabs error: ${error}`);
      setPhase("error");
    },
  });

  // ── Generate next scenario ────────────────────────────────────────────────
  const loadNextScenario = useCallback(
    async (elo: number, lang: string) => {
      setPhase("loading");
      setLastResult(null);
      setLastEloChange("");
      transcriptRef.current = [];
      judgingRef.current = false;

      try {
        const next = await generateScenario(elo, lang);
        setScenario(next);
        setPhase("ready");
      } catch (err) {
        console.error("[Gemini] Failed to generate scenario:", err);
        setErrorMessage("Failed to generate scenario. Check your Gemini API key.");
        setPhase("error");
      }
    },
    []
  );

  // Load first scenario on mount
  useEffect(() => {
    loadNextScenario(STARTING_ELO, targetLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start ElevenLabs conversation ─────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (!scenario) return;
    transcriptRef.current = [];
    judgingRef.current = false;

    const agentId = getAgentId(scenario.voiceProfile);
    if (!agentId) {
      setErrorMessage(
        "No ElevenLabs agent ID configured. Add your agent IDs to the .env file."
      );
      setPhase("error");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId,
        overrides: {
          agent: {
            prompt: {
              prompt: scenario.agentSystemPrompt,
            },
            firstMessage: scenario.openingLine,
          },
        },
      });
    } catch (err) {
      console.error("[ElevenLabs] Failed to start:", err);
      setErrorMessage(
        "Could not start conversation. Check microphone permissions and agent ID."
      );
      setPhase("error");
    }
  }, [scenario, conversation]);

  // ── Stop conversation manually ────────────────────────────────────────────
  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // endSession failed — judge what we have
      if (!judgingRef.current) {
        judgingRef.current = true;
        handleJudge();
      }
    }
  }, [conversation]);

  // ── Judge conversation via Gemini ─────────────────────────────────────────
  const handleJudge = useCallback(async () => {
    if (!scenario) return;
    setPhase("judging");

    try {
      const result = await judgeConversation(
        scenario,
        transcriptRef.current,
        currentElo
      );
      const newElo = applyEloChange(currentElo, result.eloChange);
      setLastResult(result);
      setLastEloChange(formatEloChange(result.eloChange));
      setCurrentElo(newElo);
      setPhase(result.passed ? "result_pass" : "result_fail");
    } catch (err) {
      console.error("[Gemini] Judgment failed:", err);
      const agentText = transcriptRef.current
        .filter((m) => m.role === "agent")
        .map((m) => m.text)
        .join(" ");
      const passed = agentText.includes("SCENARIO_COMPLETE_PASS");
      const eloChange = passed ? 15 : -10;
      const newElo = applyEloChange(currentElo, eloChange);

      setLastResult({
        passed,
        score: passed ? 60 : 20,
        feedback: passed ? "Well done! 🎉" : "Keep practicing! 💪",
        eloChange,
      });
      setLastEloChange(formatEloChange(eloChange));
      setCurrentElo(newElo);
      setPhase(passed ? "result_pass" : "result_fail");
    }
  }, [scenario, currentElo]);

  // ── Swipe to next scenario ────────────────────────────────────────────────
  const swipeNext = useCallback(() => {
    loadNextScenario(currentElo, targetLanguage);
  }, [currentElo, targetLanguage, loadNextScenario]);

  // ── Language change ───────────────────────────────────────────────────────
  const handleSetLanguage = useCallback(
    (lang: string) => {
      setTargetLanguage(lang);
      loadNextScenario(currentElo, lang);
    },
    [currentElo, loadNextScenario]
  );

  return {
    phase,
    currentElo,
    eloLabel: eloToLabel(currentElo),
    scenario,
    lastResult,
    lastEloChange,
    errorMessage,
    isSpeaking: conversation.isSpeaking,
    targetLanguage,
    setTargetLanguage: handleSetLanguage,
    startConversation,
    stopConversation,
    swipeNext,
  };
}
