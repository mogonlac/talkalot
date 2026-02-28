import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { scenarios, getScenarioForElo, Scenario } from "../services/scenarioData";
import { calculateNewElo } from "../services/eloCalculator";

const STARTING_ELO = 1000;

export interface LanguageTutorState {
  currentElo: number;
  currentScenario: Scenario;
  conversationStatus: string;
  isSpeaking: boolean;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  handleSuccess: () => void;
  handleFailure: () => void;
  handleSwipeNext: () => void;
}

export function useLanguageTutor(): LanguageTutorState {
  const [currentElo, setCurrentElo] = useState<number>(STARTING_ELO);
  const [currentScenario, setCurrentScenario] = useState<Scenario>(
    getScenarioForElo(STARTING_ELO)
  );

  const conversation = useConversation({
    onConnect: () => console.log("[ElevenLabs] Connected"),
    onDisconnect: () => console.log("[ElevenLabs] Disconnected"),
    onMessage: (message) => console.log("[ElevenLabs] Message:", message),
    onError: (error) => console.error("[ElevenLabs] Error:", error),
  });

  /**
   * Starts a WebRTC conversation session with the current scenario's agent.
   * Requests microphone permission before connecting.
   */
  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: currentScenario.elevenLabsAgentId,
      });
    } catch (error) {
      console.error("[useLanguageTutor] Failed to start conversation:", error);
    }
  }, [conversation, currentScenario.elevenLabsAgentId]);

  /**
   * Ends the current WebRTC session.
   */
  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("[useLanguageTutor] Failed to end conversation:", error);
    }
  }, [conversation]);

  /**
   * Marks the conversation as a success, updates ELO, then advances scenario.
   */
  const handleSuccess = useCallback(() => {
    const newElo = calculateNewElo(currentElo, currentScenario.difficultyTier, true);
    setCurrentElo(newElo);
    setCurrentScenario(getScenarioForElo(newElo));
  }, [currentElo, currentScenario.difficultyTier]);

  /**
   * Marks the conversation as a failure, updates ELO, then advances scenario.
   */
  const handleFailure = useCallback(() => {
    const newElo = calculateNewElo(currentElo, currentScenario.difficultyTier, false);
    setCurrentElo(newElo);
    setCurrentScenario(getScenarioForElo(newElo));
  }, [currentElo, currentScenario.difficultyTier]);

  /**
   * Advances to the next scenario based on current ELO without changing the score.
   * Cycles through the scenarios array for variety.
   */
  const handleSwipeNext = useCallback(() => {
    const currentIndex = scenarios.findIndex((s) => s.id === currentScenario.id);
    const nextIndex = (currentIndex + 1) % scenarios.length;
    setCurrentScenario(scenarios[nextIndex]);
  }, [currentScenario.id]);

  return {
    currentElo,
    currentScenario,
    conversationStatus: conversation.status,
    isSpeaking: conversation.isSpeaking,
    startConversation,
    endConversation,
    handleSuccess,
    handleFailure,
    handleSwipeNext,
  };
}
