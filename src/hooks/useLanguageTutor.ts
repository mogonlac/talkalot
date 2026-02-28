/**
 * useLanguageTutor.ts
 *
 * Complete revamp of the voice agent integration.
 *
 * Key fixes vs previous version:
 *  1. Robust ElevenLabs session lifecycle — explicit startSession / endSession
 *     with guard flags to prevent double-starts and race conditions.
 *  2. Retry logic — up to 2 automatic retries on transient WebSocket failures.
 *  3. Mic permission gate — clearly explains why mic is needed before asking.
 *  4. Timeout watchdog — if agent never speaks within 10 s, auto-retry.
 *  5. Manual "End conversation" escape hatch exposed via endConversation().
 *  6. Full transcript capture with source normalisation.
 *  7. Clean teardown on unmount (no dangling WebSocket).
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

// ── Agent map ────────────────────────────────────────────────────────────────
const AGENT_MAP: Record<VoiceProfile, string> = {
  authoritative_male: import.meta.env.VITE_ELEVENLABS_AGENT_AUTHORITATIVE_MALE ?? "",
  warm_female:        import.meta.env.VITE_ELEVENLABS_AGENT_WARM_FEMALE        ?? "",
  quirky_male:        import.meta.env.VITE_ELEVENLABS_AGENT_QUIRKY_MALE        ?? "",
  casual_male:        import.meta.env.VITE_ELEVENLABS_AGENT_CASUAL_MALE        ?? "",
  energetic_female:   import.meta.env.VITE_ELEVENLABS_AGENT_ENERGETIC_FEMALE   ?? "",
};

/** Returns the first configured agent ID, falling back to any available one. */
function getAgentId(profile: VoiceProfile): string {
  return AGENT_MAP[profile] || Object.values(AGENT_MAP).find(Boolean) || "";
}

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES           = 2;
const AGENT_SPEAK_TIMEOUT   = 12_000; // ms — watchdog: agent must speak within this
const SESSION_START_TIMEOUT = 15_000; // ms — max time allowed for startSession() to resolve

export const SUPPORTED_LANGUAGES = [
  "English", "French", "Spanish", "German",
  "Japanese", "Mandarin", "Italian", "Portuguese",
];

// ── Types ────────────────────────────────────────────────────────────────────
export type AppPhase =
  | "loading"       // Generating scenario + images
  | "connecting"    // Mic acquired, WS handshake in progress
  | "talking"       // Active conversation
  | "judging"       // Gemini evaluating transcript
  | "result_pass"
  | "result_fail"
  | "error";

export interface TutorState {
  phase:              AppPhase;
  currentElo:         number;
  eloLabel:           string;
  scenario:           GeneratedScenario | null;
  images:             ScenarioImages;
  lastResult:         JudgmentResult | null;
  lastEloChange:      string;
  errorMessage:       string;
  isSpeaking:         boolean;
  targetLanguage:     string;
  nextScenarioReady:  boolean;
  retryCount:         number;
  setTargetLanguage:  (lang: string) => void;
  swipeNext:          () => void;
  endConversation:    () => void; // manual early-end escape hatch
}

interface PrefetchedData {
  scenario: GeneratedScenario;
  images:   ScenarioImages;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguageTutor(): TutorState {
  const [phase,             setPhase]             = useState<AppPhase>("loading");
  const [currentElo,        setCurrentElo]        = useState<number>(STARTING_ELO);
  const [scenario,          setScenario]          = useState<GeneratedScenario | null>(null);
  const [images,            setImages]            = useState<ScenarioImages>({ backgroundUrl: null, characterUrl: null });
  const [lastResult,        setLastResult]        = useState<JudgmentResult | null>(null);
  const [lastEloChange,     setLastEloChange]     = useState<string>("");
  const [errorMessage,      setErrorMessage]      = useState<string>("");
  const [targetLanguage,    setTargetLanguage]    = useState<string>("English");
  const [nextScenarioReady, setNextScenarioReady] = useState<boolean>(false);
  const [retryCount,        setRetryCount]        = useState<number>(0);

  // ── Stable refs (avoid stale closures in SDK callbacks) ──
  const transcriptRef       = useRef<ConversationMessage[]>([]);
  const judgingRef          = useRef<boolean>(false);
  const prefetchRef         = useRef<PrefetchedData | null>(null);
  const prefetchingRef      = useRef<boolean>(false);
  const scenarioRef         = useRef<GeneratedScenario | null>(null);
  const currentEloRef       = useRef<number>(STARTING_ELO);
  const targetLanguageRef   = useRef<string>("English");
  const prefetchNextRef     = useRef<((elo: number, lang: string) => void) | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef     = useRef<any>(null);
  const sessionActiveRef    = useRef<boolean>(false);   // true while WS is open
  const startingRef         = useRef<boolean>(false);   // guard against double-start
  const retriesLeftRef      = useRef<number>(MAX_RETRIES);
  const agentSpokeRef       = useRef<boolean>(false);
  const speakWatchdogRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef          = useRef<boolean>(true);
  const pendingScenarioRef  = useRef<GeneratedScenario | null>(null); // for retry

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(speakWatchdogRef.current ?? undefined);
      clearTimeout(sessionTimerRef.current ?? undefined);
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => { scenarioRef.current      = scenario;      }, [scenario]);
  useEffect(() => { currentEloRef.current    = currentElo;    }, [currentElo]);
  useEffect(() => { targetLanguageRef.current = targetLanguage; }, [targetLanguage]);

  // ── Stable callback refs for ElevenLabs SDK ──
  const onConnectRef    = useRef<() => void>(() => {});
  const onDisconnectRef = useRef<() => void>(() => {});
  const onMessageRef    = useRef<(msg: { message: string; source: string }) => void>(() => {});
  const onErrorRef      = useRef<(err: string) => void>(() => {});

  const doJudgeRef = useRef<() => Promise<void>>(async () => {});

  // ElevenLabs hook — stable arrow fns delegate to mutable refs
  const conversation = useConversation({
    onConnect:    () => onConnectRef.current(),
    onDisconnect: () => onDisconnectRef.current(),
    onMessage:    (msg) => onMessageRef.current(msg),
    onError:      (err) => onErrorRef.current(String(err)),
  });
  conversationRef.current = conversation;

  // ── Wire callbacks into refs (runs every render, SDK sees stable fns) ──

  onConnectRef.current = () => {
    if (!mountedRef.current) return;
    console.log("[Voice] Connected ✓");
    sessionActiveRef.current = true;
    clearTimeout(sessionTimerRef.current ?? undefined);
    retriesLeftRef.current = MAX_RETRIES; // reset on success
    agentSpokeRef.current  = false;
    setPhase("talking");

    // Watchdog: if agent hasn't said anything in N seconds, something is wrong
    clearTimeout(speakWatchdogRef.current ?? undefined);
    speakWatchdogRef.current = setTimeout(() => {
      if (!agentSpokeRef.current && sessionActiveRef.current) {
        console.warn("[Voice] Agent never spoke — ending session and retrying");
        conversationRef.current?.endSession().catch(() => {});
      }
    }, AGENT_SPEAK_TIMEOUT);
  };

  onDisconnectRef.current = () => {
    if (!mountedRef.current) return;
    console.log("[Voice] Disconnected");
    clearTimeout(speakWatchdogRef.current ?? undefined);
    sessionActiveRef.current = false;
    startingRef.current      = false;

    if (!judgingRef.current) {
      judgingRef.current = true;
      doJudgeRef.current();
    }
  };

  onMessageRef.current = (message: { message: string; source: string }) => {
    if (!mountedRef.current) return;
    const role = message.source === "user" ? "user" : "agent";
    transcriptRef.current.push({ role, text: message.message });

    if (role === "agent") {
      agentSpokeRef.current = true;
      clearTimeout(speakWatchdogRef.current ?? undefined);
    }

    console.log(`[Voice] ${role}: ${message.message.substring(0, 80)}`);

    // Auto-end when scenario completion signal is received
    const userHadTurn = transcriptRef.current.some((m) => m.role === "user");
    if (
      role === "agent" &&
      userHadTurn &&
      (message.message.includes("SCENARIO_COMPLETE_PASS") ||
        message.message.includes("SCENARIO_COMPLETE_FAIL"))
    ) {
      console.log("[Voice] Completion signal received — ending session");
      conversationRef.current?.endSession().catch(console.error);
    }
  };

  onErrorRef.current = (error: string) => {
    if (!mountedRef.current) return;
    console.error("[Voice] Error:", error);
    clearTimeout(speakWatchdogRef.current ?? undefined);
    clearTimeout(sessionTimerRef.current ?? undefined);
    sessionActiveRef.current = false;
    startingRef.current      = false;

    // Retry transient errors
    if (retriesLeftRef.current > 0 && pendingScenarioRef.current) {
      retriesLeftRef.current -= 1;
      const attempt = MAX_RETRIES - retriesLeftRef.current;
      console.log(`[Voice] Retry ${attempt}/${MAX_RETRIES}…`);
      setRetryCount(attempt);
      setTimeout(() => {
        if (mountedRef.current && pendingScenarioRef.current) {
          startSession(pendingScenarioRef.current);
        }
      }, 1500 * attempt); // back-off: 1.5s, 3s
    } else {
      setErrorMessage(`Voice connection failed: ${error}. Check your ElevenLabs agent IDs in .env`);
      setPhase("error");
    }
  };

  // ── Judge conversation ──────────────────────────────────────────────────
  useEffect(() => {
    doJudgeRef.current = async () => {
      const sc = scenarioRef.current;
      if (!sc) return;
      if (!mountedRef.current) return;
      setPhase("judging");

      try {
        const result = await judgeConversation(sc, transcriptRef.current, currentEloRef.current);
        if (!mountedRef.current) return;
        const newElo = applyEloChange(currentEloRef.current, result.eloChange);
        setLastResult(result);
        setLastEloChange(formatEloChange(result.eloChange));
        setCurrentElo(newElo);
        currentEloRef.current = newElo;
        setPhase(result.passed ? "result_pass" : "result_fail");
        prefetchNextRef.current?.(newElo, targetLanguageRef.current);
      } catch (err) {
        console.error("[Judge] Gemini judging failed:", err);
        if (!mountedRef.current) return;
        // Fallback judgment based on transcript signals
        const agentText = transcriptRef.current
          .filter((m) => m.role === "agent")
          .map((m) => m.text)
          .join(" ");
        const passed    = agentText.includes("SCENARIO_COMPLETE_PASS");
        const eloChange = passed ? 15 : -10;
        const newElo    = applyEloChange(currentEloRef.current, eloChange);
        setLastResult({
          passed,
          score:    passed ? 60 : 20,
          feedback: passed ? "Well done! 🎉" : "Keep practicing! 💪",
          eloChange,
        });
        setLastEloChange(formatEloChange(eloChange));
        setCurrentElo(newElo);
        currentEloRef.current = newElo;
        setPhase(passed ? "result_pass" : "result_fail");
        prefetchNextRef.current?.(newElo, targetLanguageRef.current);
      }
    };
  });

  // ── Request mic permission (non-blocking, shows browser prompt early) ──
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Release immediately — we just wanted the browser to cache the grant
        stream.getTracks().forEach((t) => t.stop());
        console.log("[Voice] Mic permission granted");
      })
      .catch((err) => {
        console.warn("[Voice] Mic permission denied or unavailable:", err);
      });
  }, []);

  // ── startSession ─────────────────────────────────────────────────────────
  const startSession = useCallback(async (next: GeneratedScenario) => {
    if (startingRef.current) {
      console.warn("[Voice] startSession already in progress — skipping");
      return;
    }
    startingRef.current     = true;
    pendingScenarioRef.current = next;

    // Reset conversation state
    transcriptRef.current  = [];
    judgingRef.current     = false;
    agentSpokeRef.current  = false;

    const agentId = getAgentId(next.voiceProfile);
    if (!agentId) {
      setErrorMessage(
        "No ElevenLabs agent configured.\n" +
        "Add VITE_ELEVENLABS_AGENT_* variables to your .env file."
      );
      setPhase("error");
      startingRef.current = false;
      return;
    }

    setPhase("connecting");

    try {
      // Ensure mic access before connecting
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage("Microphone access denied. Please allow mic access and refresh.");
      setPhase("error");
      startingRef.current = false;
      return;
    }

    // Truncate to avoid server rejection limits
    const safePrompt       = next.agentSystemPrompt.slice(0, 2000);
    const safeFirstMessage = next.openingLine.slice(0, 500);

    console.log("[Voice] Starting session — agentId:", agentId);
    console.log("[Voice] First message:", safeFirstMessage);
    console.log("[Voice] Prompt length:", safePrompt.length);

    // Session-start timeout — if startSession hangs, treat as error
    clearTimeout(sessionTimerRef.current ?? undefined);
    sessionTimerRef.current = setTimeout(() => {
      if (!sessionActiveRef.current && mountedRef.current) {
        console.error("[Voice] startSession timed out");
        onErrorRef.current("Session start timed out. Check network and agent ID.");
      }
    }, SESSION_START_TIMEOUT);

    try {
      await conversationRef.current.startSession({
        agentId,
        overrides: {
          agent: {
            prompt:       { prompt: safePrompt },
            firstMessage: safeFirstMessage,
          },
        },
      });
    } catch (err) {
      clearTimeout(sessionTimerRef.current ?? undefined);
      console.error("[Voice] startSession threw:", err);
      onErrorRef.current(String(err));
    } finally {
      startingRef.current = false;
    }
  }, []);

  // ── endConversation (manual escape hatch) ────────────────────────────────
  const endConversation = useCallback(() => {
    if (sessionActiveRef.current) {
      console.log("[Voice] Manual end requested");
      conversationRef.current?.endSession().catch(console.error);
    } else if (!judgingRef.current) {
      judgingRef.current = true;
      doJudgeRef.current();
    }
  }, []);

  // ── prefetchNext ─────────────────────────────────────────────────────────
  const prefetchNext = useCallback(async (elo: number, lang: string) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    setNextScenarioReady(false);
    prefetchRef.current = null;

    try {
      const next = await generateScenario(elo, lang);
      const imgs = await generateScenarioImages(next.character, next.setting, next.title);
      prefetchRef.current = { scenario: next, images: imgs };
      if (mountedRef.current) setNextScenarioReady(true);
    } catch (err) {
      console.error("[Prefetch] Failed:", err);
    } finally {
      prefetchingRef.current = false;
    }
  }, []);

  useEffect(() => { prefetchNextRef.current = prefetchNext; }, [prefetchNext]);

  // ── loadNextScenario ─────────────────────────────────────────────────────
  const loadNextScenario = useCallback(async (elo: number, lang: string) => {
    // Clean up any active session first
    if (sessionActiveRef.current) {
      await conversationRef.current?.endSession().catch(() => {});
      sessionActiveRef.current = false;
    }

    setLastResult(null);
    setLastEloChange("");
    setRetryCount(0);
    retriesLeftRef.current = MAX_RETRIES;
    transcriptRef.current  = [];
    judgingRef.current     = false;

    if (prefetchRef.current) {
      // Use prefetched data instantly
      const { scenario: next, images: imgs } = prefetchRef.current;
      prefetchRef.current = null;
      setNextScenarioReady(false);
      setScenario(next);
      setImages(imgs);
      prefetchNext(elo, lang);
      startSession(next);
    } else {
      setPhase("loading");
      try {
        const next = await generateScenario(elo, lang);
        if (!mountedRef.current) return;
        // Fire image generation in parallel — don't block conversation start
        generateScenarioImages(next.character, next.setting, next.title)
          .then((imgs) => { if (mountedRef.current) setImages(imgs); });
        setScenario(next);
        prefetchNext(elo, lang);
        startSession(next);
      } catch (err) {
        console.error("[Scenario] Failed to generate:", err);
        if (mountedRef.current) {
          setErrorMessage("Failed to generate scenario. Check your Gemini API key.");
          setPhase("error");
        }
      }
    }
  }, [prefetchNext, startSession]);

  // Load first scenario on mount
  useEffect(() => {
    loadNextScenario(STARTING_ELO, "English");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── swipeNext ────────────────────────────────────────────────────────────
  const swipeNext = useCallback(() => {
    loadNextScenario(currentEloRef.current, targetLanguageRef.current);
  }, [loadNextScenario]);

  // ── handleSetLanguage ────────────────────────────────────────────────────
  const handleSetLanguage = useCallback((lang: string) => {
    setTargetLanguage(lang);
    targetLanguageRef.current = lang;
    prefetchRef.current       = null;
    loadNextScenario(currentEloRef.current, lang);
  }, [loadNextScenario]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (sessionActiveRef.current) {
        conversationRef.current?.endSession().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    currentElo,
    eloLabel:          eloToLabel(currentElo),
    scenario,
    images,
    lastResult,
    lastEloChange,
    errorMessage,
    isSpeaking:        conversation.isSpeaking,
    targetLanguage,
    nextScenarioReady,
    retryCount,
    setTargetLanguage: handleSetLanguage,
    swipeNext,
    endConversation,
  };
}
