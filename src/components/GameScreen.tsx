/**
 * GameScreen.tsx — LingoTok
 *
 * Design: "Extreme Duolingo"
 *  - Pure white (#FFFFFF) background
 *  - Duolingo green (#58CC02) primary action
 *  - Bold rounded typography (Nunito 900)
 *  - Massive pill mic button with 3D border-bottom shadow
 *  - Avatar bobs smoothly (CSS keyframes, always running)
 *  - Background image blurred heavily so foreground text stays king
 *  - TikTok-style vertical slide transition between scenarios
 *
 * Rules of Hooks: ALL useState / useRef / useCallback / useEffect
 * are declared unconditionally at the top of GameScreen — never inside
 * a conditional branch.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useTutor, LANGUAGES } from "../hooks/useTutor";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  green:      "#58CC02",
  greenDark:  "#46A302",
  greenLight: "#D7F5B1",
  blue:       "#1CB0F6",
  blueDark:   "#0A91C9",
  red:        "#FF4B4B",
  redDark:    "#CC2222",
  yellow:     "#FFD900",
  yellowDark: "#C9A800",
  white:      "#FFFFFF",
  offWhite:   "#F7F7F7",
  gray:       "#AFAFAF",
  grayLight:  "#E5E5E5",
  dark:       "#2B2B2B",
  ink:        "#4B4B4B",
};

const FONT = "'Nunito', 'DIN Round', 'Trebuchet MS', sans-serif";

// ── Reusable sub-components ───────────────────────────────────────────────────

/** Duolingo 3D pill button — border-bottom acts as the "shadow" */
function DuoButton({
  label, color, darkColor, onClick, disabled = false, fullWidth = false, size = "md",
}: {
  label: React.ReactNode;
  color: string;
  darkColor: string;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [pressed, setPressed] = useState(false);
  const pad   = size === "lg" ? "18px 36px" : size === "sm" ? "8px 18px" : "13px 26px";
  const fs    = size === "lg" ? 20 : size === "sm" ? 13 : 16;
  const br    = size === "lg" ? 22 : 16;
  const depth = pressed ? 0 : 5;

  return (
    <button
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => { setPressed(false); if (!disabled) onClick(); }}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        justifyContent:"center",
        gap:           6,
        width:         fullWidth ? "100%" : undefined,
        padding:       pad,
        borderRadius:  br,
        background:    disabled ? C.gray : color,
        border:        "none",
        borderBottom:  `${depth}px solid ${disabled ? "#888" : darkColor}`,
        transform:     pressed ? "translateY(4px)" : "translateY(0)",
        cursor:        disabled ? "not-allowed" : "pointer",
        fontFamily:    FONT,
        fontWeight:    900,
        fontSize:      fs,
        color:         C.white,
        letterSpacing: "0.3px",
        transition:    "transform 0.07s, border-bottom 0.07s",
        userSelect:    "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}

/** Animated star for result screen */
function Star({ filled, delay }: { filled: boolean; delay: number }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!filled) { setLit(false); return; }
    const t = setTimeout(() => setLit(true), delay);
    return () => clearTimeout(t);
  }, [filled, delay]);

  return (
    <div style={{
      width: 68, height: 68,
      transform:  lit ? "scale(1.18)" : "scale(0.9)",
      transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <svg viewBox="0 0 64 64" fill="none">
        <polygon
          points="32,4 39.5,24 61,24 44,37 50.5,57 32,45 13.5,57 20,37 3,24 24.5,24"
          fill={lit ? C.yellow : C.grayLight}
          stroke={lit ? C.yellowDark : "#CCC"}
          strokeWidth="3"
          strokeLinejoin="round"
          style={{ transition: "fill 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>
    </div>
  );
}

/** The massive mic button */
function MicButton({
  isListening, isAgentSpeaking, onStart, onStop,
}: {
  isListening: boolean;
  isAgentSpeaking: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const busy     = isAgentSpeaking;
  const color    = busy ? C.gray : isListening ? C.red : C.green;
  const dark     = busy ? "#888" : isListening ? C.redDark : C.greenDark;
  const [pr, setPr] = useState(false);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      <div style={{ position:"relative", width:96, height:96 }}>
        {/* Pulse ring */}
        {isListening && (
          <>
            <div style={{
              position:"absolute", inset:-14, borderRadius:"50%",
              border:`3px solid ${C.green}`,
              animation:"pulseRing 1.4s ease-out infinite",
              opacity:0.7,
            }}/>
            <div style={{
              position:"absolute", inset:-6, borderRadius:"50%",
              border:`3px solid ${C.green}`,
              animation:"pulseRing 1.4s ease-out 0.4s infinite",
              opacity:0.5,
            }}/>
          </>
        )}
        <button
          onPointerDown={() => { if (!busy) { setPr(true); if (!isListening) onStart(); } }}
          onPointerUp={() => { setPr(false); if (!busy && isListening) onStop(); }}
          onPointerLeave={() => setPr(false)}
          disabled={busy}
          style={{
            width:96, height:96,
            borderRadius:"50%",
            background:color,
            border:"none",
            borderBottom:`${pr ? 2 : 6}px solid ${dark}`,
            transform: pr ? "translateY(4px)" : "translateY(0)",
            cursor: busy ? "not-allowed" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:40,
            transition:"background 0.2s, border-bottom 0.07s, transform 0.07s",
            WebkitTapHighlightColor:"transparent",
          }}
        >
          {isListening ? "⏹" : "🎙️"}
        </button>
      </div>
      <span style={{
        fontSize:13, fontWeight:800, fontFamily:FONT,
        color: busy ? C.gray : isListening ? C.red : C.ink,
      }}>
        {busy ? "Speaking…" : isListening ? "Tap to stop" : "Hold to Talk"}
      </span>
    </div>
  );
}

/** Chat bubble */
function Bubble({ role, text, last }: { role: string; text: string; last: boolean }) {
  const isUser = role === "user";
  return (
    <div style={{
      display:"flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom:8, opacity: last ? 1 : 0.65,
    }}>
      <div style={{
        maxWidth:"82%",
        background: isUser ? C.blue : C.white,
        color:      isUser ? C.white : C.dark,
        borderRadius: isUser ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
        padding:"10px 15px",
        fontSize:14, fontWeight:700, lineHeight:1.45,
        fontFamily:FONT,
        borderBottom: isUser ? `3px solid ${C.blueDark}` : "3px solid #DDD",
        border: isUser ? "none" : `2px solid #EBEBEB`,
      }}>
        {text}
      </div>
    </div>
  );
}

// ── Slide transition wrapper ───────────────────────────────────────────────────
/**
 * Each scenario card is a full-screen "slide". When nextScenario fires we
 * animate the current card up and the new card slides in from below — TikTok style.
 */
function SlideWrapper({ children, slideKey }: { children: React.ReactNode; slideKey: string }) {
  const [anim, setAnim] = useState<"enter" | "idle">("enter");
  useEffect(() => {
    setAnim("enter");
    const t = setTimeout(() => setAnim("idle"), 500);
    return () => clearTimeout(t);
  }, [slideKey]);

  return (
    <div style={{
      position:"absolute", inset:0,
      transform:  anim === "enter" ? "translateY(100%)" : "translateY(0)",
      transition: anim === "enter" ? "none" : "transform 0.42s cubic-bezier(0.22,1,0.36,1)",
      // Force reflow trick: we set "enter" first then idle on next frame
    }}>
      {children}
    </div>
  );
}

// ── Global CSS (injected once) ────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes bobAvatar {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes pulseRing {
    0%   { transform: scale(0.85); opacity: 0.8; }
    100% { transform: scale(1.4);  opacity: 0; }
  }
  @keyframes bounce {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-14px); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes starPop {
    0%   { transform: scale(0) rotate(-20deg); }
    65%  { transform: scale(1.25) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  * { box-sizing: border-box; }
  input:focus { outline: none; }
`;

// ── Main component ────────────────────────────────────────────────────────────
export function GameScreen() {
  // ── ALL hooks unconditionally at top ──────────────────────────────────
  const tutor       = useTutor();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState("");
  const [slideKey,  setSlideKey]  = useState("0");

  // Inject global CSS once
  useEffect(() => {
    const id = "lingotok-css";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Auto-scroll bubbles
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tutor.messages]);

  // Bump slideKey when we enter a new talking session (scenario changed)
  const prevScenarioTitle = useRef<string | null>(null);
  useEffect(() => {
    if (
      tutor.phase === "talking" &&
      tutor.scenario?.title !== prevScenarioTitle.current
    ) {
      prevScenarioTitle.current = tutor.scenario?.title ?? null;
      setSlideKey(k => String(Number(k) + 1));
    }
  }, [tutor.phase, tutor.scenario?.title]);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t) return;
    tutor.sendText(t);
    setInputText("");
  }, [inputText, tutor]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleNext = useCallback(() => {
    tutor.nextScenario();
  }, [tutor]);

  // ── SPLASH screen (before first gesture) ─────────────────────────────
  if (!tutor.audioUnlocked) {
    return (
      <div style={{
        minHeight:"100dvh", background:C.white,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:32, fontFamily:FONT, padding:"40px 24px",
        textAlign:"center",
      }}>
        {/* Logo */}
        <div style={{
          width:110, height:110, borderRadius:"50%",
          background:C.green, borderBottom:`10px solid ${C.greenDark}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:58,
        }}>🌍</div>

        <div>
          <h1 style={{ fontSize:34, fontWeight:900, color:C.dark, margin:"0 0 12px", lineHeight:1.1 }}>
            LingoTok
          </h1>
          <p style={{ fontSize:17, color:C.gray, margin:0, fontWeight:700, maxWidth:300 }}>
            Real conversations. Real confidence. Tap to start!
          </p>
        </div>

        {/* Language picker on splash */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:15, fontWeight:800, color:C.ink }}>Practice in:</span>
          <select
            value={tutor.language}
            onChange={e => tutor.setLanguage(e.target.value)}
            style={{
              fontSize:15, fontWeight:800, fontFamily:FONT,
              padding:"8px 16px", borderRadius:14,
              border:`2px solid ${C.grayLight}`,
              borderBottom:`4px solid ${C.grayLight}`,
              background:C.white, color:C.dark, cursor:"pointer",
            }}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* THE big unlock button */}
        <DuoButton
          label="🎙️  Start Practice"
          color={C.green} darkColor={C.greenDark}
          onClick={tutor.unlock}
          size="lg" fullWidth
        />

        <p style={{ fontSize:13, color:C.gray, margin:0, fontWeight:700 }}>
          Allow microphone access when prompted
        </p>
      </div>
    );
  }

  // ── LOADING screen ────────────────────────────────────────────────────
  if (tutor.phase === "loading") {
    return (
      <div style={{
        minHeight:"100dvh", background:C.white,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:24, fontFamily:FONT, padding:32,
      }}>
        <div style={{
          width:100, height:100, borderRadius:"50%",
          background:C.green, borderBottom:`8px solid ${C.greenDark}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:52, animation:"bounce 0.8s ease-in-out infinite",
        }}>✨</div>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:26, fontWeight:900, color:C.dark, margin:"0 0 8px" }}>
            Creating your scenario…
          </p>
          <p style={{ fontSize:15, color:C.gray, margin:0, fontWeight:700 }}>
            Just a moment!
          </p>
        </div>
      </div>
    );
  }

  // ── SCORING screen ────────────────────────────────────────────────────
  if (tutor.phase === "scoring") {
    return (
      <div style={{
        minHeight:"100dvh", background:C.white,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:20, fontFamily:FONT,
      }}>
        <div style={{
          width:88, height:88, borderRadius:"50%",
          background:C.yellow, borderBottom:`7px solid ${C.yellowDark}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:44, animation:"bounce 0.8s ease-in-out infinite",
        }}>🤔</div>
        <p style={{ fontSize:22, fontWeight:900, color:C.dark, margin:0 }}>
          Reviewing your conversation…
        </p>
      </div>
    );
  }

  // ── RESULT screen ─────────────────────────────────────────────────────
  if (tutor.phase === "result") {
    return (
      <div style={{
        minHeight:"100dvh", background:C.white,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"40px 24px", gap:0, fontFamily:FONT,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{
          position:"relative", zIndex:1,
          width:"100%", maxWidth:420,
          display:"flex", flexDirection:"column",
          alignItems:"center", gap:28,
          animation:"fadeUp 0.5s ease both",
        }}>
          {/* Connection error banner */}
          {tutor.error && (
            <div style={{
              width:"100%", background:"#FFF0F0",
              border:`2px solid ${C.red}`, borderRadius:16,
              padding:"14px 18px", textAlign:"center",
              color:C.red, fontWeight:800, fontSize:14,
            }}>
              ⚠️ {tutor.error}
            </div>
          )}

          {/* Trophy */}
          {!tutor.error && (
            <div style={{ fontSize:80, lineHeight:1 }}>
              {tutor.stars === 3 ? "🏆" : tutor.stars === 2 ? "⭐" : tutor.stars >= 1 ? "👍" : "💪"}
            </div>
          )}

          {/* Stars */}
          {!tutor.error && (
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              {[1,2,3].map(i => (
                <Star key={i} filled={tutor.stars >= i} delay={(i-1)*380} />
              ))}
            </div>
          )}

          {/* Feedback */}
          {!tutor.error && (
            <div style={{
              background:C.white, borderRadius:24,
              padding:"20px 28px", width:"100%", textAlign:"center",
              border:`3px solid ${C.green}`,
              borderBottom:`6px solid ${C.greenDark}`,
            }}>
              <p style={{ margin:0, fontSize:17, fontWeight:800, color:C.dark, lineHeight:1.5 }}>
                {tutor.feedback}
              </p>
            </div>
          )}

          {/* Next / Retry button */}
          <DuoButton
            label={tutor.error ? "Retry →" : tutor.nextReady ? "Next Challenge →" : "⏳ Loading next…"}
            color={C.green} darkColor={C.greenDark}
            onClick={handleNext}
            fullWidth size="lg"
          />

          {/* Language picker */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:14, fontWeight:800, color:C.gray }}>Language:</span>
            <select
              value={tutor.language}
              onChange={e => tutor.setLanguage(e.target.value)}
              style={{
                fontSize:14, fontWeight:800, fontFamily:FONT,
                padding:"6px 14px", borderRadius:14,
                border:`2px solid ${C.grayLight}`,
                background:C.white, color:C.dark, cursor:"pointer",
              }}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // ── TALKING screen ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100dvh",
      maxWidth:430, margin:"0 auto",
      position:"relative", overflow:"hidden",
      fontFamily:FONT, background:C.white,
    }}>
      {/* ── Slide transition container ── */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
        <SlideWrapper slideKey={slideKey}>

          {/* ── Background scene (blurred) ── */}
          <div style={{ position:"absolute", inset:0, zIndex:0, background:C.white }}>
            {tutor.bgImage && (
              <img src={tutor.bgImage} alt="" style={{
                width:"100%", height:"100%",
                objectFit:"cover",
                filter:"blur(14px) brightness(0.82)",
                transform:"scale(1.08)", // hide blur edges
                opacity:0.55,
              }}/>
            )}
            {/* Bottom gradient so text pops */}
            <div style={{
              position:"absolute", inset:0,
              background:"linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.92) 62%)",
            }}/>
          </div>

          {/* ── TOP BAR ── */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, zIndex:20,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"16px 16px 0",
          }}>
            {/* Goal badge */}
            <div style={{
              background:C.green, color:C.white,
              borderRadius:999, padding:"7px 18px",
              fontWeight:900, fontSize:14,
              borderBottom:`4px solid ${C.greenDark}`,
              maxWidth:"55%", overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              🎯 {tutor.scenario?.task ?? "…"}
            </div>

            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Language selector */}
              <select
                value={tutor.language}
                onChange={e => tutor.setLanguage(e.target.value)}
                style={{
                  fontSize:12, fontWeight:800, fontFamily:FONT,
                  padding:"6px 10px", borderRadius:12,
                  border:`2px solid ${C.grayLight}`,
                  background:C.white, color:C.dark, cursor:"pointer",
                }}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* End button */}
              <button
                onClick={tutor.endConversation}
                disabled={tutor.messages.length === 0 || tutor.isAgentSpeaking}
                style={{
                  background: tutor.messages.length === 0 || tutor.isAgentSpeaking ? C.gray : C.red,
                  border:"none", borderRadius:12,
                  borderBottom:`3px solid ${tutor.messages.length === 0 || tutor.isAgentSpeaking ? "#888" : C.redDark}`,
                  padding:"6px 11px", color:C.white,
                  fontWeight:900, fontSize:12, fontFamily:FONT,
                  cursor: tutor.messages.length === 0 || tutor.isAgentSpeaking ? "not-allowed" : "pointer",
                  whiteSpace:"nowrap",
                }}
              >
                End ✓
              </button>
            </div>
          </div>

          {/* ── AVATAR (always bobs) ── */}
          <div style={{
            position:"absolute",
            top:"13%", left:0, right:0,
            zIndex:10,
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:10,
          }}>
            {/* Avatar circle + speaking ring — all relative, no translate hacks */}
            <div style={{
              position:"relative",
              width:140, height:140,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {/* Speaking pulse ring */}
              {tutor.isAgentSpeaking && (
                <div style={{
                  position:"absolute",
                  inset:-18,
                  borderRadius:"50%",
                  border:`4px solid ${C.green}`,
                  animation:"pulseRing 1.2s ease-out infinite",
                  pointerEvents:"none",
                }}/>
              )}
              {/* Emoji avatar circle */}
              <div style={{
                width:130, height:130, borderRadius:"50%",
                background: tutor.isAgentSpeaking ? C.greenLight : C.green,
                borderBottom:`7px solid ${C.greenDark}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:64,
                animation:"bobAvatar 2.8s ease-in-out infinite",
                transition:"background 0.3s",
              }}>
                {tutor.avatarEmoji}
              </div>
            </div>

            {/* Character name tag */}
            {tutor.scenario && (
              <div style={{
                background:"rgba(255,255,255,0.95)",
                borderRadius:999, padding:"5px 16px",
                fontSize:13, fontWeight:800, color:C.ink,
                border:`2px solid ${C.grayLight}`,
                borderBottom:`3px solid ${C.grayLight}`,
                maxWidth:200, textAlign:"center",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>
                {tutor.scenario.character.split(",")[0]}
                {tutor.isAgentSpeaking && (
                  <span style={{ marginLeft:6, color:C.green }}>●</span>
                )}
              </div>
            )}
          </div>

          {/* ── BOTTOM PANEL ── */}
          <div style={{
            position:"absolute",
            bottom:0, left:0, right:0, zIndex:20,
            padding:"0 16px 28px",
            display:"flex", flexDirection:"column", gap:10,
          }}>
            {/* Chat bubbles */}
            {tutor.messages.length > 0 && (
              <div
                ref={scrollRef}
                style={{
                  background:"rgba(255,255,255,0.97)",
                  borderRadius:22,
                  padding:"12px 14px",
                  maxHeight:190,
                  overflowY:"auto",
                  border:`2px solid ${C.grayLight}`,
                  borderBottom:`4px solid ${C.grayLight}`,
                }}
              >
                {tutor.messages.slice(-5).map((m, i, arr) => (
                  <Bubble key={i} role={m.role} text={m.text} last={i === arr.length - 1} />
                ))}
                {/* Typing dots */}
                {tutor.isAgentSpeaking && (
                  <div style={{ display:"flex", gap:5, padding:"4px 8px" }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width:9, height:9, borderRadius:"50%",
                        background:C.gray,
                        animation:`bounce 0.7s ease-in-out ${i*0.17}s infinite alternate`,
                      }}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mic button */}
            <div style={{ display:"flex", justifyContent:"center", paddingTop:4 }}>
              <MicButton
                isListening={tutor.isListening}
                isAgentSpeaking={tutor.isAgentSpeaking}
                onStart={tutor.startListening}
                onStop={tutor.stopListening}
              />
            </div>

            {/* Text input */}
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Or type here…"
                disabled={tutor.isAgentSpeaking || tutor.isListening}
                style={{
                  flex:1, padding:"11px 16px",
                  borderRadius:18,
                  border:`2px solid ${C.grayLight}`,
                  borderBottom:`4px solid ${C.grayLight}`,
                  background: tutor.isAgentSpeaking ? C.offWhite : C.white,
                  fontSize:14, fontWeight:700, fontFamily:FONT, color:C.dark,
                  opacity: tutor.isAgentSpeaking || tutor.isListening ? 0.55 : 1,
                  transition:"opacity 0.2s",
                }}
              />
              <DuoButton
                label="→"
                color={C.blue} darkColor={C.blueDark}
                onClick={handleSend}
                disabled={!inputText.trim() || tutor.isAgentSpeaking || tutor.isListening}
                size="sm"
              />
            </div>
          </div>

        </SlideWrapper>
      </div>
    </div>
  );
}
