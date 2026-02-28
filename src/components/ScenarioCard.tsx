/**
 * ScenarioCard.tsx
 * Primitive, unstyled mobile-first UI card.
 * Supports swipe gestures (touch), mouse drag, and arrow keys.
 * Lovable will replace all visual styling — do NOT add Tailwind/CSS here.
 */

import { useEffect, useRef } from "react";
import { AppPhase } from "../hooks/useLanguageTutor";
import { GeneratedScenario, JudgmentResult } from "../services/geminiService";

interface ScenarioCardProps {
  phase: AppPhase;
  scenario: GeneratedScenario | null;
  currentElo: number;
  eloLabel: string;
  lastResult: JudgmentResult | null;
  lastEloChange: string;
  errorMessage: string;
  isSpeaking: boolean;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onSwipeNext: () => void;
}

const SWIPE_THRESHOLD = 80; // px to count as a swipe

export function ScenarioCard({
  phase,
  scenario,
  currentElo,
  eloLabel,
  lastResult,
  lastEloChange,
  errorMessage,
  isSpeaking,
  onStartTalking,
  onStopTalking,
  onSwipeNext,
}: ScenarioCardProps) {
  const touchStartY = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  // ── Keyboard: arrow down or space = swipe next ───────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        onSwipeNext();
      }
      if (e.key === " " || e.key === "Enter") {
        if (phase === "ready") onStartTalking();
        if (phase === "talking") onStopTalking();
        if (phase === "result_pass" || phase === "result_fail") onSwipeNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, onStartTalking, onStopTalking, onSwipeNext]);

  // ── Touch swipe ───────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > SWIPE_THRESHOLD) onSwipeNext(); // swipe up = next
    touchStartY.current = null;
  };

  // ── Mouse drag (laptop testing) ───────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartY.current = e.clientY;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    const delta = mouseStartY.current - e.clientY;
    if (delta > SWIPE_THRESHOLD) onSwipeNext();
    mouseStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 16px",
        maxWidth: "430px",  // iPhone 14 Pro Max width
        margin: "0 auto",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      {/* ── TOP: ELO bar ── */}
      <div>
        <p><strong>ELO:</strong> {currentElo} — {eloLabel}</p>
      </div>

      {/* ── MIDDLE: Scenario content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>

        {phase === "loading" && (
          <p>⏳ Generating your scenario...</p>
        )}

        {phase === "error" && (
          <>
            <p>❌ Error: {errorMessage}</p>
            <button onClick={onSwipeNext}>Try Again</button>
          </>
        )}

        {(phase === "ready" || phase === "talking") && scenario && (
          <>
            <h2>{scenario.title}</h2>
            <p><strong>Character:</strong> {scenario.character}</p>
            <p><strong>Setting:</strong> {scenario.setting}</p>
            <p>{scenario.situation}</p>
            <p><strong>Language:</strong> {scenario.language} · Tier {scenario.difficultyTier}/5</p>
            <p><strong>Reward:</strong> +{scenario.xpReward} XP on pass</p>
          </>
        )}

        {phase === "judging" && (
          <p>🤔 Judging your conversation...</p>
        )}

        {(phase === "result_pass" || phase === "result_fail") && lastResult && (
          <>
            <h2>{lastResult.passed ? "✅ PASS!" : "❌ FAIL"}</h2>
            <p>{lastResult.feedback}</p>
            <p><strong>Score:</strong> {lastResult.score}/100</p>
            <p><strong>ELO:</strong> {lastEloChange}</p>
          </>
        )}

      </div>

      {/* ── BOTTOM: Action buttons ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {phase === "ready" && (
          <button onClick={onStartTalking}>
            🎤 Start Talking
          </button>
        )}

        {phase === "talking" && (
          <>
            <p>{isSpeaking ? "🔊 Agent is speaking..." : "🎙️ Your turn to speak"}</p>
            <button onClick={onStopTalking}>
              ⏹ End Conversation
            </button>
          </>
        )}

        {(phase === "result_pass" || phase === "result_fail" || phase === "error") && (
          <button onClick={onSwipeNext}>
            ↓ Next Scenario
          </button>
        )}

        {phase === "ready" && (
          <button onClick={onSwipeNext}>
            ↓ Skip (Swipe Next)
          </button>
        )}

        <p style={{ fontSize: "12px", opacity: 0.5, textAlign: "center" }}>
          Swipe up · Drag · ↓ Arrow key · Space
        </p>
      </div>
    </div>
  );
}
