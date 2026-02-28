/**
 * ScenarioCard.tsx
 * Primitive, unstyled mobile-first UI.
 * Supports touch swipe, mouse drag, and arrow keys.
 * Lovable will replace all visual styling.
 */

import { useEffect, useRef } from "react";
import { AppPhase, SUPPORTED_LANGUAGES } from "../hooks/useLanguageTutor";
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
  targetLanguage: string;
  onSetLanguage: (lang: string) => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onSwipeNext: () => void;
}

const SWIPE_THRESHOLD = 80;

export function ScenarioCard({
  phase,
  scenario,
  currentElo,
  eloLabel,
  lastResult,
  lastEloChange,
  errorMessage,
  isSpeaking,
  targetLanguage,
  onSetLanguage,
  onStartTalking,
  onStopTalking,
  onSwipeNext,
}: ScenarioCardProps) {
  const touchStartY = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") onSwipeNext();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phase === "ready") onStartTalking();
        if (phase === "talking") onStopTalking();
        if (phase === "result_pass" || phase === "result_fail") onSwipeNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, onStartTalking, onStopTalking, onSwipeNext]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > SWIPE_THRESHOLD) onSwipeNext();
    touchStartY.current = null;
  };

  // Mouse drag
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
        maxWidth: "430px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "16px",
        userSelect: "none",
        fontFamily: "sans-serif",
      }}
    >
      {/* ── TOP BAR: Goal label + ELO + Language selector ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        {/* Goal label — 2-3 words, prominent */}
        <h1 style={{ margin: 0, fontSize: "22px" }}>
          {scenario?.goalLabel ?? "..."}
        </h1>

        {/* ELO */}
        <span style={{ fontSize: "13px" }}>
          {currentElo} · {eloLabel}
        </span>
      </div>

      {/* Language selector */}
      <div style={{ marginBottom: "12px" }}>
        <select
          value={targetLanguage}
          onChange={(e) => onSetLanguage(e.target.value)}
          style={{ fontSize: "14px", padding: "4px 8px" }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* ── MIDDLE: Scenario content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>

        {phase === "loading" && (
          <p>⏳ Generating scenario...</p>
        )}

        {phase === "error" && (
          <>
            <p>❌ {errorMessage}</p>
            <button onClick={onSwipeNext}>Try Again</button>
          </>
        )}

        {(phase === "ready" || phase === "talking") && scenario && (
          <>
            <h2 style={{ margin: "0 0 4px" }}>{scenario.title}</h2>
            <p style={{ margin: 0 }}><strong>{scenario.character}</strong></p>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>{scenario.setting}</p>
            <p style={{ margin: "8px 0" }}>{scenario.situation}</p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              🌍 {scenario.language} · Tier {scenario.difficultyTier}/5 · +{scenario.xpReward} XP on pass
            </p>
          </>
        )}

        {phase === "judging" && (
          <p>🤔 Judging your performance...</p>
        )}

        {(phase === "result_pass" || phase === "result_fail") && lastResult && (
          <>
            <h2 style={{ margin: 0 }}>{lastResult.passed ? "✅ PASS!" : "❌ FAIL"}</h2>
            <p>{lastResult.feedback}</p>
            <p><strong>Score:</strong> {lastResult.score}/100</p>
            <p><strong>ELO:</strong> {lastEloChange}</p>
          </>
        )}

      </div>

      {/* ── BOTTOM: Action buttons ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "16px" }}>

        {phase === "ready" && (
          <>
            <button onClick={onStartTalking}>🎤 Start Talking</button>
            <button onClick={onSwipeNext}>↓ Skip Scenario</button>
          </>
        )}

        {phase === "talking" && (
          <>
            <p style={{ margin: 0, textAlign: "center" }}>
              {isSpeaking ? "🔊 Agent speaking..." : "🎙️ Your turn"}
            </p>
            <button onClick={onStopTalking}>⏹ End Conversation</button>
          </>
        )}

        {(phase === "result_pass" || phase === "result_fail") && (
          <button onClick={onSwipeNext}>↓ Next Scenario</button>
        )}

        <p style={{ fontSize: "11px", opacity: 0.4, textAlign: "center", margin: 0 }}>
          Swipe up · Drag · ↓ Arrow · Space/Enter
        </p>
      </div>
    </div>
  );
}
