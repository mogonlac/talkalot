/**
 * ScenarioCard.tsx
 *
 * Duolingo-style full-screen layout:
 *  - Layer 1: full-screen background image (always full opacity)
 *  - Layer 2: subtle bottom scrim for readability
 *  - Layer 3: top bar (ELO pill · goal label · language selector)
 *  - Layer 4: floating character avatar (animated when speaking)
 *  - Layer 5: bottom card (status / result)
 *
 * Voice agent changes:
 *  - "End conversation" button visible during talking phase
 *  - Retry counter shown during connecting/retrying
 *  - Clearer connecting state messaging
 */

import { useEffect, useRef } from "react";
import { AppPhase, SUPPORTED_LANGUAGES } from "../hooks/useLanguageTutor";
import { GeneratedScenario, JudgmentResult } from "../services/geminiService";
import { ScenarioImages } from "../services/imageService";

interface ScenarioCardProps {
  phase:             AppPhase;
  scenario:          GeneratedScenario | null;
  images:            ScenarioImages;
  currentElo:        number;
  eloLabel:          string;
  lastResult:        JudgmentResult | null;
  lastEloChange:     string;
  errorMessage:      string;
  isSpeaking:        boolean;
  targetLanguage:    string;
  nextScenarioReady: boolean;
  retryCount:        number;
  onSetLanguage:     (lang: string) => void;
  onSwipeNext:       () => void;
  onEndConversation: () => void;
}

const SWIPE_THRESHOLD = 60;

// ── Duolingo palette ─────────────────────────────────────────────────────────
const DUO = {
  green:     "#58CC02",
  greenDark: "#46A302",
  red:       "#FF4B4B",
  redDark:   "#CC2222",
  blue:      "#1CB0F6",
  blueDark:  "#0A91C9",
  yellow:    "#FFD900",
  white:     "#FFFFFF",
  gray:      "#AFAFAF",
  dark:      "#3C3C3C",
  cardBg:    "rgba(255,255,255,0.97)",
};

export function ScenarioCard({
  phase,
  scenario,
  images,
  currentElo,
  eloLabel,
  lastResult,
  lastEloChange,
  errorMessage,
  isSpeaking,
  targetLanguage,
  nextScenarioReady,
  retryCount,
  onSetLanguage,
  onSwipeNext,
  onEndConversation,
}: ScenarioCardProps) {
  const touchStartY = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  const canSwipe = phase === "result_pass" || phase === "result_fail" || phase === "error";

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (canSwipe && (e.key === "ArrowDown" || e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        onSwipeNext();
      }
      if (phase === "talking" && e.key === "Escape") {
        onEndConversation();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canSwipe, phase, onSwipeNext, onEndConversation]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > SWIPE_THRESHOLD && canSwipe) onSwipeNext();
    touchStartY.current = null;
  };
  const handleMouseDown = (e: React.MouseEvent) => { mouseStartY.current = e.clientY; };
  const handleMouseUp   = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    const delta = mouseStartY.current - e.clientY;
    if (delta > SWIPE_THRESHOLD && canSwipe) onSwipeNext();
    mouseStartY.current = null;
  };

  // ── Loading / Connecting ────────────────────────────────────────────────
  if (phase === "loading" || phase === "connecting") {
    const isLoading = phase === "loading";
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#DFF6FF", gap: 20,
        fontFamily: "'Nunito', 'Trebuchet MS', sans-serif",
      }}>
        {/* Bouncing icon */}
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: isLoading ? DUO.green : DUO.blue,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 52,
          boxShadow: `0 6px 0 ${isLoading ? DUO.greenDark : DUO.blueDark}`,
          animation: "duoBounce 0.7s ease-in-out infinite alternate",
        }}>
          {isLoading ? "✨" : "🎙️"}
        </div>

        <p style={{ fontSize: 22, fontWeight: 800, color: DUO.dark, margin: 0 }}>
          {isLoading ? "Creating your challenge…" : retryCount > 0 ? `Reconnecting… (${retryCount}/${2})` : "Connecting voice…"}
        </p>
        <p style={{ fontSize: 14, color: DUO.gray, margin: 0 }}>
          {isLoading
            ? "Gemini is cooking something fun"
            : retryCount > 0
            ? "Transient error — retrying automatically"
            : "Setting up your conversation partner"}
        </p>

        {/* Mic hint */}
        {!isLoading && (
          <div style={{
            marginTop: 8,
            background: DUO.cardBg,
            borderRadius: 16,
            padding: "10px 20px",
            fontSize: 13,
            color: DUO.dark,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          }}>
            🎤 Please allow microphone access if prompted
          </div>
        )}

        <style>{`
          @keyframes duoBounce {
            from { transform: translateY(0); }
            to   { transform: translateY(-14px); }
          }
        `}</style>
      </div>
    );
  }

  const isPass       = phase === "result_pass";
  const accentColor  = isPass ? DUO.green : phase === "result_fail" ? DUO.red : DUO.blue;
  const accentDark   = isPass ? DUO.greenDark : phase === "result_fail" ? DUO.redDark : DUO.blueDark;
  const showAvatar   = phase === "talking" || phase === "judging";

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
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Nunito', 'Trebuchet MS', sans-serif",
        background: "#DFF6FF",
        userSelect: "none",
      }}
    >
      {/* ── LAYER 1: BACKGROUND ── */}
      {images.backgroundUrl ? (
        <img
          src={images.backgroundUrl}
          alt="scene background"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: 1,
          }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #DFF6FF 0%, #B3E5FC 60%, #81D4FA 100%)",
        }} />
      )}

      {/* ── LAYER 2: BOTTOM SCRIM ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.38) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── LAYER 3: TOP BAR ── */}
      <div style={{
        position: "relative", zIndex: 20,
        display: "flex", alignItems: "center",
        padding: "14px 16px 0",
        gap: 8,
      }}>
        {/* ELO pill */}
        <div style={{
          background: DUO.cardBg,
          borderRadius: 20, padding: "4px 12px",
          fontSize: 12, fontWeight: 800, color: DUO.dark,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 4,
          flexShrink: 0,
        }}>
          ⚡ {currentElo}
          <span style={{ color: DUO.gray, fontWeight: 600 }}> · {eloLabel}</span>
        </div>

        {/* Goal label — centered */}
        {scenario?.goalLabel && (
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            background: DUO.cardBg,
            borderRadius: 20, padding: "4px 16px",
            fontSize: 13, fontWeight: 800, color: DUO.dark,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}>
            {scenario.goalLabel}
          </div>
        )}

        {/* Language selector */}
        <div style={{ marginLeft: "auto" }}>
          <select
            value={targetLanguage}
            onChange={(e) => onSetLanguage(e.target.value)}
            style={{
              fontSize: 12, padding: "4px 8px",
              background: DUO.cardBg, color: DUO.dark,
              border: "none", borderRadius: 20,
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              cursor: "pointer",
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── LAYER 4: CHARACTER AVATAR ── */}
      {showAvatar && (
        <div style={{
          position: "absolute",
          bottom: "40%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          {/* Pulsing speak ring */}
          {isSpeaking && (
            <div style={{
              position: "absolute",
              width: 224, height: 224,
              borderRadius: "50%",
              border: `4px solid ${DUO.green}`,
              animation: "speakRing 1s ease-in-out infinite",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }} />
          )}

          {images.characterUrl ? (
            <img
              src={images.characterUrl}
              alt="character"
              style={{
                width: 200, height: 200,
                objectFit: "contain",
                filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.4))",
                animation: isSpeaking ? "avatarBob 1.2s ease-in-out infinite" : "none",
              }}
            />
          ) : (
            /* Emoji fallback */
            <div style={{
              fontSize: 100,
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))",
              animation: isSpeaking ? "avatarBob 1.2s ease-in-out infinite" : "none",
            }}>
              {phase === "judging" ? "🤔" : isSpeaking ? "🔊" : "🎙️"}
            </div>
          )}
        </div>
      )}

      {/* ── LAYER 5: BOTTOM CARD ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        zIndex: 20,
        padding: "24px 24px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>

        {/* TALKING phase */}
        {phase === "talking" && scenario && (
          <>
            <div style={{
              background: DUO.cardBg,
              borderRadius: 24,
              padding: "18px 20px",
              boxShadow: "0 -2px 24px rgba(0,0,0,0.15), 0 4px 0 rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              {/* Status dot */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                background: isSpeaking ? DUO.green : DUO.blue,
                boxShadow: `0 4px 0 ${isSpeaking ? DUO.greenDark : DUO.blueDark}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                animation: isSpeaking ? "avatarBob 1.2s ease-in-out infinite" : "none",
              }}>
                {isSpeaking ? "🔊" : "🎙️"}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: DUO.dark }}>
                  {isSpeaking ? scenario.character.split(",")[0] : "Your turn!"}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: DUO.gray, fontWeight: 600 }}>
                  {isSpeaking ? "Speaking…" : `Respond in ${scenario.language}`}
                </p>
              </div>
            </div>

            {/* End conversation button */}
            <button
              onClick={onEndConversation}
              style={{
                background: "rgba(255,255,255,0.85)",
                border: `2px solid ${DUO.gray}`,
                borderRadius: 20,
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 700,
                color: DUO.dark,
                cursor: "pointer",
                width: "100%",
                letterSpacing: "0.2px",
              }}
            >
              ✋ End Conversation &amp; Get Feedback
            </button>
          </>
        )}

        {/* JUDGING */}
        {phase === "judging" && (
          <div style={{
            background: DUO.cardBg,
            borderRadius: 24,
            padding: "24px",
            boxShadow: "0 4px 0 rgba(0,0,0,0.08)",
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DUO.dark }}>
              ⏳ Judging your answer…
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: DUO.gray }}>
              Gemini is reviewing your conversation
            </p>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div style={{
            background: DUO.cardBg,
            borderRadius: 24,
            padding: "24px",
            boxShadow: "0 4px 0 rgba(0,0,0,0.08)",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 44, margin: "0 0 8px" }}>😬</p>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: DUO.dark }}>
              {errorMessage}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: DUO.gray }}>
              Swipe up ↑ or press Enter to try again
            </p>
          </div>
        )}

        {/* RESULT */}
        {(phase === "result_pass" || phase === "result_fail") && lastResult && (
          <div style={{
            background: DUO.cardBg,
            borderRadius: 24,
            padding: "24px",
            boxShadow: `0 4px 0 ${accentDark}, 0 -2px 24px rgba(0,0,0,0.15)`,
            border: `3px solid ${accentColor}`,
            textAlign: "center",
          }}>
            {/* Result icon */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: accentColor,
              boxShadow: `0 5px 0 ${accentDark}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 16px",
            }}>
              {lastResult.passed ? "🏆" : "💪"}
            </div>

            <p style={{
              fontSize: 26, fontWeight: 900, color: accentColor,
              margin: "0 0 8px", letterSpacing: "-0.5px",
            }}>
              {lastResult.passed ? "Excellent!" : "Keep going!"}
            </p>

            <p style={{ fontSize: 14, color: DUO.dark, margin: "0 0 14px", lineHeight: 1.4 }}>
              {lastResult.feedback}
            </p>

            {/* XP chip */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: accentColor,
              borderRadius: 20, padding: "6px 18px",
              color: DUO.white, fontWeight: 900, fontSize: 18,
              boxShadow: `0 3px 0 ${accentDark}`,
              marginBottom: 14,
            }}>
              ⚡ {lastEloChange}
            </div>

            <p style={{ fontSize: 12, color: DUO.gray, margin: 0, fontWeight: 600 }}>
              {nextScenarioReady
                ? "🟢 Next challenge ready! Swipe up ↑"
                : "Swipe up ↑ for next challenge"}
            </p>
          </div>
        )}
      </div>

      {/* ── ANIMATIONS ── */}
      <style>{`
        @keyframes avatarBob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes speakRing {
          0%   { transform: translate(-50%,-50%) scale(0.92); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1.18); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
