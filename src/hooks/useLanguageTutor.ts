/**
 * useLanguageTutor.ts
 * The single source of truth for all business logic.
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
} from "../services/geminiService";
import { applyEloChange, formatEloChange, eloToLabel, STARTING_ELO } from "../services/eloCalculator";

const ELEVENLABS_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string;

export type AppPhase =
  | "loading"        // Generating next scenario via Gemini
  | "ready"          // Scenario ready, waiting for user to start
  | "talking"        // Active ElevenLabs conversation
  | "judging"        // Gemini is judging the conversation
  | "result_pass"    // Showing pass result
  | "result_fail"    // Showing fail result
  | "error";         // Something went wrong

export interface TutorState {
  phase: AppPhase;
  currentElo: number;
  eloLabel: string;
  scenario: GeneratedScenario | null;
  lastResult: JudgmentResult | null;
  lastEloChange: string;
  errorMessage: string;
  isSpeaking: boolean;
  // Actions
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  swipeNext: () => void;
}

export function useLanguageTutor(): TutorState {
  const [phase, setPhase] = useState<AppPhase>("loading");
  const [currentElo, setCurrentElo] = useState<number>(STARTING_ELO);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [lastResult, setLastResult] = useState<JudgmentResult | null>(null);
  const [lastEloChange, setLastEloChange] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [targetLanguage] = useState<string>("French");

  // Accumulate transcript messages during conversation
  const transcriptRef = useRef<ConversationMessage[]>([]);

  // ------------------------------------------------------------------
  // ElevenLabs conversation hook
  // ------------------------------------------------------------------
  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      setPhase("talking");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected — judging conversation");
      handleJudge();
    },
    onMessage: (message: { message: string; source: string }) => {
      const role = message.source === "user" ? "user" : "agent";
      transcriptRef.current.push({ role, text: message.message });

      // Check if agent signalled pass/fail mid-conversation
      if (
        message.source === "ai" &&
        (message.message.includes("SCENARIO_COMPLETE_PASS") ||
          message.message.includes("SCENARIO_COMPLETE_FAIL"))
      ) {
        conversation.endSession().catch(console.error);
      }
    },
    onError: (error: string) => {
      console.error("[ElevenLabs] Error:", error);
      setErrorMessage(error);
      setPhase("error");
    },
  });

  // ------------------------------------------------------------------
  // Generate a new scenario from Gemini
  // ------------------------------------------------------------------
  const loadNextScenario = useCallback(async (elo: number) => {
    setPhase("loading");
    setLastResult(null);
    setLastEloChange("");
    transcriptRef.current = [];

    try {
      const next = await generateScenario(elo, targetLanguage);
      setScenario(next);
      setPhase("ready");
    } catch (err) {
      console.error("[Gemini] Failed to generate scenario:", err);
      setErrorMessage("Failed to generate scenario. Check your Gemini API key.");
      setPhase("error");
    }
  }, [targetLanguage]);

  // Load the first scenario on mount
  useEffect(() => {
    loadNextScenario(STARTING_ELO);
  }, [loadNextScenario]);

  // ------------------------------------------------------------------
  // Start ElevenLabs conversation
  // ------------------------------------------------------------------
  const startConversation = useCallback(async () => {
    if (!scenario) return;
    transcriptRef.current = [];

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        overrides: {
          agent: {
            prompt: {
              prompt: scenario.agentSystemPrompt,
            },
            firstMessage: `[Scene: ${scenario.setting}] ${scenario.character} is ready. Begin.`,
          },
        },
      });
    } catch (err) {
      console.error("[ElevenLabs] Failed to start:", err);
      setErrorMessage("Could not start conversation. Check microphone permissions and ElevenLabs agent ID.");
      setPhase("error");
    }
  }, [scenario, conversation]);

  // ------------------------------------------------------------------
  // Stop ElevenLabs conversation manually
  // ------------------------------------------------------------------
  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("[ElevenLabs] Failed to end session:", err);
      handleJudge();
    }
  }, [conversation]);

  // ------------------------------------------------------------------
  // Judge the conversation via Gemini
  // ------------------------------------------------------------------
  const handleJudge = useCallback(async () => {
    if (!scenario) return;
    setPhase("judging");

    try {
      const result = await judgeConversation(scenario, transcriptRef.current, currentElo);
      const newElo = applyEloChange(currentElo, result.eloChange);
      const changeLabel = formatEloChange(result.eloChange);

      setLastResult(result);
      setLastEloChange(changeLabel);
      setCurrentElo(newElo);
      setPhase(result.passed ? "result_pass" : "result_fail");
    } catch (err) {
      console.error("[Gemini] Failed to judge:", err);
      // Fallback: check transcript for PASS/FAIL keywords
      const fullText = transcriptRef.current.map((m) => m.text).join(" ");
      const passed = fullText.includes("SCENARIO_COMPLETE_PASS");
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

  // ------------------------------------------------------------------
  // Swipe to next scenario
  // ------------------------------------------------------------------
  const swipeNext = useCallback(() => {
    const eloSnapshot = currentElo;
    loadNextScenario(eloSnapshot);
  }, [currentElo, loadNextScenario]);

  return {
    phase,
    currentElo,
    eloLabel: eloToLabel(currentElo),
    scenario,
    lastResult,
    lastEloChange,
    errorMessage,
    isSpeaking: conversation.isSpeaking,
    startConversation,
    stopConversation,
    swipeNext,
  };
}
