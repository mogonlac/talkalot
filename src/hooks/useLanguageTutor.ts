/**
 * useLanguageTutor.ts
 * Single source of truth for all business logic.
 * Prefetches next scenario + images in background while user is in current one.
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
import { generateScenarioImages, ScenarioImages } from "../services/imageService";
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

export const SUPPORTED_LANGUAGES = [
  "English", "French", "Spanish", "German",
  "Japanese", "Mandarin", "Italian", "Portuguese",
];

export type AppPhase =
  | "loading"       // First load only — no prefetched scenario ready yet
  | "ready"         // Scenario ready, waiting for user
  | "talking"       // Active ElevenLabs conversation
  | "judging"       // Gemini judging the conversation
  | "result_pass"   // Showing pass result
  | "result_fail"   // Showing fail result
  | "error";

export interface TutorState {
  phase: AppPhase;
  currentElo: number;
  eloLabel: string;
  scenario: GeneratedScenario | null;
  images: ScenarioImages;
  lastResult: JudgmentResult | null;
  lastEloChange: string;
  errorMessage: string;
  isSpeaking: boolean;
  targetLanguage: string;
  nextScenarioReady: boolean;
  setTargetLanguage: (lang: string) => void;
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  swipeNext: () => void;
}

// Prefetched next scenario + images stored outside React state to avoid re-renders
interface PrefetchedData {
  scenario: GeneratedScenario;
  images: ScenarioImages;
}

export function useLanguageTutor(): TutorState {
  const [phase, setPhase] = useState<AppPhase>("loading");
  const [currentElo, setCurrentElo] = useState<number>(STARTING_ELO);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [images, setImages] = useState<ScenarioImages>({ backgroundUrl: null, characterUrl: null });
  const [lastResult, setLastResult] = useState<JudgmentResult | null>(null);
  const [lastEloChange, setLastEloChange] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("English");
  const [nextScenarioReady, setNextScenarioReady] = useState<boolean>(false);

  const transcriptRef = useRef<ConversationMessage[]>([]);
  const judgingRef = useRef<boolean>(false);
  const prefetchRef = useRef<PrefetchedData | null>(null);
  const prefetchingRef = useRef<boolean>(false);

  // ── ElevenLabs ─────────────────────────────────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      setPhase("talking");
    },
    onDisconnect: () => {
      if (!judgingRef.current) {
        judgingRef.current = true;
        handleJudge();
      }
    },
    onMessage: (message: { message: string; source: string }) => {
      const role = message.source === "user" ? "user" : "agent";
      transcriptRef.current.push({ role, text: message.message });
      if (
        message.source !== "user" &&
        (message.message.includes("SCENARIO_COMPLETE_PASS") ||
          message.message.includes("SCENARIO_COMPLETE_FAIL"))
      ) {
        conversation.endSession().catch(console.error);
      }
    },
    onError: (error: string) => {
      setErrorMessage(`ElevenLabs: ${error}`);
      setPhase("error");
    },
  });

  // ── Prefetch next scenario + images in background ───────────────────────
  const prefetchNext = useCallback(async (elo: number, lang: string) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    setNextScenarioReady(false);
    prefetchRef.current = null;

    try {
      const next = await generateScenario(elo, lang);
      // Generate images in parallel — don't block on them
      const imgs = await generateScenarioImages(next.character, next.setting, next.title);
      prefetchRef.current = { scenario: next, images: imgs };
      setNextScenarioReady(true);
    } catch (err) {
      console.error("[Prefetch] Failed:", err);
      // Silently fail — swipeNext will try again
    } finally {
      prefetchingRef.current = false;
    }
  }, []);

  // ── Load scenario (uses prefetch if available, else fetches fresh) ──────
  const loadNextScenario = useCallback(
    async (elo: number, lang: string) => {
      setLastResult(null);
      setLastEloChange("");
      transcriptRef.current = [];
      judgingRef.current = false;

      if (prefetchRef.current) {
        // Instant — use prefetched data
        const { scenario: next, images: imgs } = prefetchRef.current;
        prefetchRef.current = null;
        setNextScenarioReady(false);
        setScenario(next);
        setImages(imgs);
        setPhase("ready");
        // Start prefetching the one after
        prefetchNext(elo, lang);
      } else {
        // First load or prefetch failed — show loading screen
        setPhase("loading");
        try {
          const next = await generateScenario(elo, lang);
          const imgs = await generateScenarioImages(next.character, next.setting, next.title);
          setScenario(next);
          setImages(imgs);
          setPhase("ready");
          // Start prefetching next
          prefetchNext(elo, lang);
        } catch (err) {
          console.error("[Gemini] Failed to generate scenario:", err);
          setErrorMessage("Failed to generate scenario. Check your Gemini API key.");
          setPhase("error");
        }
      }
    },
    [prefetchNext]
  );

  // Load first scenario on mount
  useEffect(() => {
    loadNextScenario(STARTING_ELO, "English");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start conversation ──────────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (!scenario) return;
    transcriptRef.current = [];
    judgingRef.current = false;

    const agentId = getAgentId(scenario.voiceProfile);
    if (!agentId) {
      setErrorMessage("No ElevenLabs agent ID configured. Add agent IDs to .env file.");
      setPhase("error");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId,
        overrides: {
          agent: {
            prompt: { prompt: scenario.agentSystemPrompt },
            firstMessage: scenario.openingLine,
          },
        },
      });
    } catch (err) {
      console.error("[ElevenLabs] Failed to start:", err);
      setErrorMessage("Could not start. Check mic permissions and agent ID.");
      setPhase("error");
    }
  }, [scenario, conversation]);

  // ── Stop conversation ───────────────────────────────────────────────────
  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      if (!judgingRef.current) {
        judgingRef.current = true;
        handleJudge();
      }
    }
  }, [conversation]);

  // ── Judge conversation ──────────────────────────────────────────────────
  const handleJudge = useCallback(async () => {
    if (!scenario) return;
    setPhase("judging");

    try {
      const result = await judgeConversation(scenario, transcriptRef.current, currentElo);
      const newElo = applyEloChange(currentElo, result.eloChange);
      setLastResult(result);
      setLastEloChange(formatEloChange(result.eloChange));
      setCurrentElo(newElo);
      setPhase(result.passed ? "result_pass" : "result_fail");
      // Start prefetching next scenario with updated ELO
      prefetchNext(newElo, targetLanguage);
    } catch {
      const agentText = transcriptRef.current.filter((m) => m.role === "agent").map((m) => m.text).join(" ");
      const passed = agentText.includes("SCENARIO_COMPLETE_PASS");
      const eloChange = passed ? 15 : -10;
      const newElo = applyEloChange(currentElo, eloChange);
      setLastResult({ passed, score: passed ? 60 : 20, feedback: passed ? "Well done! 🎉" : "Keep practicing! 💪", eloChange });
      setLastEloChange(formatEloChange(eloChange));
      setCurrentElo(newElo);
      setPhase(passed ? "result_pass" : "result_fail");
      prefetchNext(newElo, targetLanguage);
    }
  }, [scenario, currentElo, targetLanguage, prefetchNext]);

  // ── Swipe next ──────────────────────────────────────────────────────────
  const swipeNext = useCallback(() => {
    loadNextScenario(currentElo, targetLanguage);
  }, [currentElo, targetLanguage, loadNextScenario]);

  // ── Language change ─────────────────────────────────────────────────────
  const handleSetLanguage = useCallback((lang: string) => {
    setTargetLanguage(lang);
    prefetchRef.current = null;
    loadNextScenario(currentElo, lang);
  }, [currentElo, loadNextScenario]);

  return {
    phase,
    currentElo,
    eloLabel: eloToLabel(currentElo),
    scenario,
    images,
    lastResult,
    lastEloChange,
    errorMessage,
    isSpeaking: conversation.isSpeaking,
    targetLanguage,
    nextScenarioReady,
    setTargetLanguage: handleSetLanguage,
    startConversation,
    stopConversation,
    swipeNext,
  };
}
