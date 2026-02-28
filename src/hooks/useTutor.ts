/**
 * useTutor.ts — LingoTok core hook
 *
 * Phase flow: loading → talking → scoring → result (loops)
 *
 * APIs:
 *   Chat:         Groq llama-3.3-70b  (fallback: Gemini 2.0 Flash)
 *   Scenario gen: Gemini 2.0 Flash
 *   Scoring:      Gemini 2.0 Flash
 *   Images:       Imagen 3 Fast  (v1beta/models/imagen-3.0-fast-generate-001)
 *   TTS:          ElevenLabs REST stream
 *   STT:          Groq Whisper  (fallback: browser SpeechRecognition)
 *
 * Buffering: while user plays scenario N, scenario N+1 is built + imaged in bg.
 * AudioContext: created lazily on first user gesture to avoid browser block.
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ── Env ───────────────────────────────────────────────────────────────────────
const GEMINI_KEY     = import.meta.env.VITE_GEMINI_API_KEY     ?? "";
const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY ?? "";
const GROQ_KEY       = import.meta.env.VITE_GROQ_API_KEY       ?? "";

// ── Correct API endpoints ─────────────────────────────────────────────────────
const GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_CHAT   = `${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
// Imagen not available on this key — images disabled, using CSS avatars
const GROQ_CHAT     = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER  = "https://api.groq.com/openai/v1/audio/transcriptions";
const EL_VOICE_ID   = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const EL_STT_URL    = "https://api.elevenlabs.io/v1/speech-to-text";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Phase = "loading" | "talking" | "scoring" | "result";

export interface Scenario {
  title:        string;
  task:         string;       // 2–4 words, shown in goal badge
  character:    string;       // "Sofia, a busy barista"
  setting:      string;       // "A bright Parisian café"
  language:     string;
  openingLine:  string;       // Character's first line
  systemPrompt: string;
}

export interface Message {
  role: "user" | "assistant";
  text: string;
}

export interface QueuedScenario {
  scenario: Scenario;
  bg:       string | null;
  avatar:   string | null;
}

export interface TutorState {
  phase:           Phase;
  scenario:        Scenario | null;
  bgImage:         string | null;
  avatarImage:     string | null;
  avatarEmoji:     string;
  messages:        Message[];
  stars:           number;
  feedback:        string;
  isAgentSpeaking: boolean;
  isListening:     boolean;
  language:        string;
  nextReady:       boolean;
  error:           string | null;
  audioUnlocked:   boolean;        // true after first user gesture
  unlock:          () => void;     // call on "Start Practice" tap
  setLanguage:     (l: string) => void;
  startListening:  () => void;
  stopListening:   () => void;
  sendText:        (text: string) => void;
  endConversation: () => void;
  nextScenario:    () => void;
}

export const LANGUAGES = [
  "English", "French", "Spanish", "German",
  "Italian", "Japanese", "Portuguese", "Mandarin",
];

const LANG_LOCALE: Record<string, string> = {
  French: "fr-FR", Spanish: "es-ES", German: "de-DE",
  Italian: "it-IT", Japanese: "ja-JP", Portuguese: "pt-PT",
  Mandarin: "zh-CN", English: "en-US",
};

const MAX_EXCHANGES = 4;

// ── Fallback scenario bank ────────────────────────────────────────────────────
const SCENARIO_BANK: Omit<Scenario, "systemPrompt" | "openingLine">[] = [
  { title: "Café Order",       task: "Buy Coffee",    character: "Sofia, a cheerful barista",      setting: "A busy Parisian café",       language: "French"     },
  { title: "Train Ticket",     task: "Buy a Ticket",  character: "Pierre, a ticket agent",         setting: "Paris Gare du Nord",         language: "French"     },
  { title: "Market Haggle",    task: "Buy Souvenirs", character: "Carlos, a market vendor",        setting: "A Madrid street market",     language: "Spanish"    },
  { title: "Hotel Check-In",   task: "Check In",      character: "Yuki, a hotel receptionist",    setting: "A Tokyo hotel lobby",        language: "Japanese"   },
  { title: "Pharmacy Visit",   task: "Buy Medicine",  character: "Hans, a friendly pharmacist",   setting: "A Berlin pharmacy",          language: "German"     },
  { title: "Restaurant Order", task: "Order Food",    character: "Giulia, a cheerful waitress",   setting: "A Rome trattoria",           language: "Italian"    },
  { title: "Airport Help",     task: "Get Directions",character: "Emma, an airport info agent",   setting: "Heathrow Airport terminal",  language: "English"    },
  { title: "Grocery Shop",     task: "Buy Groceries", character: "Ana, a grocery store clerk",    setting: "A Lisbon supermarket",       language: "Portuguese" },
];

const OPENING_FALLBACKS: Record<string, string> = {
  French:     "Bonjour ! Qu'est-ce que je vous sers aujourd'hui ?",
  Spanish:    "¡Hola! ¿En qué le puedo ayudar?",
  German:     "Guten Tag! Was darf ich Ihnen bringen?",
  Italian:    "Buongiorno! Cosa le porto?",
  Japanese:   "いらっしゃいませ！ご注文はお決まりですか？",
  Portuguese: "Olá! Em que posso ajudá-lo?",
  Mandarin:   "你好！我可以帮您点什么？",
  English:    "Hello! How can I help you today?",
};

// ── Pure API helpers ──────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_CHAT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0, maxOutputTokens: 600 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGroqChat(systemPrompt: string, messages: Message[]): Promise<string> {
  const res = await fetch(GROQ_CHAT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      messages:    [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
      ],
      max_tokens:  100,
      temperature: 0.85,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Image generation disabled — Imagen not available on this API key.
// avatarEmoji is derived from scenario character/setting instead.

// Lazy AudioContext — created on first user gesture, reused thereafter
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

async function speakText(text: string): Promise<void> {
  if (!ELEVENLABS_KEY || !text.trim()) return;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}/stream`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":    ELEVENLABS_KEY,
          "Content-Type":  "application/json",
          "Accept":        "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id:       "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) return;
    const buf     = await res.arrayBuffer();
    const ctx     = getAudioCtx();
    const decoded = await ctx.decodeAudioData(buf);
    await new Promise<void>((resolve) => {
      const src   = ctx.createBufferSource();
      src.buffer  = decoded;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      src.start(0);
    });
  } catch (e) {
    console.warn("[TTS]", e);
  }
}

async function transcribeBlob(blob: Blob, lang: string): Promise<string> {
  // 1️⃣ ElevenLabs Scribe (primary — we always have this key)
  if (ELEVENLABS_KEY) {
    try {
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      form.append("model_id", "scribe_v1");
      // Pass language code hint for better accuracy
      const locale = LANG_LOCALE[lang] ?? "en";
      form.append("language_code", locale.split("-")[0]);
      const res = await fetch(EL_STT_URL, {
        method:  "POST",
        headers: { "xi-api-key": ELEVENLABS_KEY },
        body:    form,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.text ?? "";
        if (text.trim()) return text.trim();
      }
    } catch (e) {
      console.warn("[STT/EL]", e);
    }
  }

  // 2️⃣ Groq Whisper fallback
  if (GROQ_KEY) {
    try {
      const form = new FormData();
      form.append("file",  blob, "audio.webm");
      form.append("model", "whisper-large-v3");
      const res = await fetch(GROQ_WHISPER, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}` },
        body:    form,
      });
      if (res.ok) {
        const data = await res.json();
        return data.text ?? "";
      }
    } catch (e) {
      console.warn("[STT/Groq]", e);
    }
  }

  return "";
}

// ── Scenario building ─────────────────────────────────────────────────────────

async function buildScenario(lang: string): Promise<Scenario> {
  const prompt = `Generate a fun, beginner-friendly language learning roleplay scenario in ${lang}.

Rules:
- Everyday situation: café, shop, hotel, train, pharmacy, market, airport, restaurant
- The character speaks ${lang} natively
- "task" is 2–4 words max shown as a goal badge (e.g. "Buy Coffee")
- "openingLine" is what the character says FIRST in ${lang} — 1–2 sentences ending with a question
- "systemPrompt": instructions for the AI playing the character:
    stay in character, speak ONLY ${lang}, reply in 1–2 short sentences, be warm, after ${MAX_EXCHANGES} exchanges wrap up naturally
- Difficulty: beginner-friendly

Respond ONLY with valid JSON, no markdown fences:
{
  "title": "short scenario title",
  "task": "2-4 word goal",
  "character": "Name, role",
  "setting": "brief setting",
  "language": "${lang}",
  "openingLine": "character's first line in ${lang}",
  "systemPrompt": "AI instructions"
}`;

  try {
    const raw     = await callGemini(prompt);
    const cleaned = raw.replace(/^```[a-z]*\n?|```$/gm, "").trim();
    // Find JSON object even if there's leading/trailing text
    const match   = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    return JSON.parse(match[0]) as Scenario;
  } catch (e) {
    console.warn("[scenario] falling back to bank:", e);
    const pool = SCENARIO_BANK.filter(s => s.language === lang);
    const base = pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : SCENARIO_BANK[Math.floor(Math.random() * SCENARIO_BANK.length)];
    return {
      ...base,
      language:     lang,
      openingLine:  OPENING_FALLBACKS[lang] ?? OPENING_FALLBACKS.English,
      systemPrompt: `You are ${base.character} at ${base.setting}. Speak ONLY in ${lang}. Keep replies to 1–2 short sentences. Be warm and helpful. After ${MAX_EXCHANGES} exchanges, wrap up naturally.`,
    };
  }
}

// ── Avatar emoji picker (replaces Imagen) ────────────────────────────────────
const SETTING_EMOJIS: [string, string][] = [
  ["café",        "☕"], ["coffee",     "☕"], ["bar",        "🍺"],
  ["restaurant",  "🍽️"], ["trattoria",  "🍝"], ["food",       "🍕"],
  ["train",       "🚂"], ["station",    "🚉"], ["airport",    "✈️"],
  ["hotel",       "🏨"], ["pharmacy",   "💊"], ["hospital",   "🏥"],
  ["market",      "🛒"], ["shop",       "🛍️"], ["store",      "🏪"],
  ["school",      "🎓"], ["office",     "💼"], ["bank",       "🏦"],
  ["park",        "🌳"], ["beach",      "🏖️"], ["museum",     "🏛️"],
];

function pickEmoji(sc: Scenario): string {
  const hay = (sc.setting + " " + sc.title).toLowerCase();
  for (const [kw, em] of SETTING_EMOJIS) {
    if (hay.includes(kw)) return em;
  }
  return "🧑";
}

// ── Scoring ───────────────────────────────────────────────────────────────────

async function scoreConversation(
  scenario: Scenario,
  messages: Message[],
): Promise<{ stars: number; feedback: string }> {
  const userTurns = messages.filter(m => m.role === "user");
  if (userTurns.length === 0) {
    return { stars: 1, feedback: "Give it a go next time! You've got this 💪" };
  }

  const transcript = messages
    .map(m => `${m.role === "user" ? "You" : "Character"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a generous, encouraging language teacher scoring a learner.

Scenario: ${scenario.title} in ${scenario.language}
Goal: ${scenario.task}

Transcript:
${transcript}

Award 0–3 stars (be generous):
- 3 stars: completed the goal well
- 2 stars: mostly completed, minor issues
- 1 star: tried but struggled
- 0 stars: didn't engage at all

Write ONE short encouraging sentence (max 12 words) with an emoji.

Reply ONLY with valid JSON:
{"stars": <0-3>, "feedback": "<sentence with emoji>"}`;

  try {
    const raw     = await callGemini(prompt);
    const cleaned = raw.replace(/^```[a-z]*\n?|```$/gm, "").trim();
    const match   = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const parsed = JSON.parse(match[0]);
    return {
      stars:    Math.min(3, Math.max(0, Number(parsed.stars ?? 2))),
      feedback: String(parsed.feedback ?? "Great effort! 🌟"),
    };
  } catch {
    return { stars: 2, feedback: "Well done, keep practising! 🌟" };
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTutor(): TutorState {
  // All state at top level — never conditional
  const [phase,           setPhase]           = useState<Phase>("loading");
  const [scenario,        setScenario]        = useState<Scenario | null>(null);
  const [bgImage,         setBgImage]         = useState<string | null>(null);
  const [avatarImage,     setAvatarImage]     = useState<string | null>(null);
  const [avatarEmoji,     setAvatarEmoji]     = useState("🧑");
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [stars,           setStars]           = useState(0);
  const [feedback,        setFeedback]        = useState("");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isListening,     setIsListening]     = useState(false);
  const [language,        setLanguageState]   = useState("English");
  const [nextReady,       setNextReady]       = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [audioUnlocked,   setAudioUnlocked]   = useState(false);

  // Refs — stable across renders, safe in async callbacks
  const messagesRef    = useRef<Message[]>([]);
  const exchangeRef    = useRef(0);
  const scenarioRef    = useRef<Scenario | null>(null);
  const langRef        = useRef("English");
  const queueRef       = useRef<QueuedScenario | null>(null);
  const mountedRef       = useRef(true);
  const mediaRecRef      = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const browserSRRef     = useRef<any>(null);
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Unlock audio on first gesture ─────────────────────────────────────
  const unlock = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
    getAudioCtx(); // create + resume AudioContext on this gesture
  }, []);

  // ── Agent reply ────────────────────────────────────────────────────────
  const agentReply = useCallback(async (
    sc: Scenario,
    currentMessages: Message[],
    isOpening = false,
  ): Promise<Message[]> => {
    if (!mountedRef.current) return currentMessages;
    setIsAgentSpeaking(true);

    let text: string;
    if (isOpening) {
      text = sc.openingLine;
    } else {
      try {
        text = GROQ_KEY
          ? await callGroqChat(sc.systemPrompt, currentMessages)
          : await callGemini(
              `${sc.systemPrompt}\n\nConversation:\n${currentMessages.map(m => `${m.role === "user" ? "You" : "Character"}: ${m.text}`).join("\n")}\n\nReply as the character (1–2 short sentences in ${sc.language}):`
            );
        if (!text.trim()) throw new Error("empty");
      } catch {
        text = OPENING_FALLBACKS[sc.language] ?? "I see, please go on.";
      }
    }

    const newMsg:  Message  = { role: "assistant", text };
    const updated: Message[] = [...currentMessages, newMsg];
    messagesRef.current = updated;
    if (mountedRef.current) setMessages(updated);

    // Only speak if audio has been unlocked by a user gesture
    if (audioUnlockedRef.current) {
      await speakText(text);
    }

    if (mountedRef.current) setIsAgentSpeaking(false);
    return updated;
  }, []);

  // ── Finish & score ─────────────────────────────────────────────────────
  const finishConversation = useCallback(async (
    finalMessages: Message[],
    sc: Scenario,
  ) => {
    if (!mountedRef.current) return;
    setPhase("scoring");
    const { stars: s, feedback: f } = await scoreConversation(sc, finalMessages);
    if (!mountedRef.current) return;
    setStars(s);
    setFeedback(f);
    setPhase("result");
  }, []);

  // ── Handle a user turn ─────────────────────────────────────────────────
  const handleUserMessage = useCallback(async (text: string) => {
    if (!mountedRef.current || !scenarioRef.current) return;
    const sc = scenarioRef.current;
    exchangeRef.current += 1;

    const withUser: Message[] = [...messagesRef.current, { role: "user", text }];
    messagesRef.current = withUser;
    setMessages(withUser);

    if (exchangeRef.current >= MAX_EXCHANGES) {
      const final = await agentReply(sc, withUser);
      await finishConversation(final, sc);
    } else {
      await agentReply(sc, withUser);
    }
  }, [agentReply, finishConversation]);

  // ── Background prefetch ────────────────────────────────────────────────
  const prefetchNext = useCallback((lang: string) => {
    buildScenario(lang).then(next => {
      if (mountedRef.current) {
        queueRef.current = { scenario: next, bg: null, avatar: null };
        setNextReady(true);
      }
    }).catch(() => {});
  }, []);

  // ── Load a scenario ────────────────────────────────────────────────────
  const loadScenario = useCallback(async (lang: string, useQueue = true) => {
    if (!mountedRef.current) return;

    setPhase("loading");
    setError(null);
    setMessages([]);
    setStars(0);
    setFeedback("");
    setBgImage(null);
    setAvatarImage(null);
    setNextReady(false);
    exchangeRef.current = 0;
    messagesRef.current = [];

    let sc: Scenario;

    if (useQueue && queueRef.current) {
      sc = queueRef.current.scenario;
      queueRef.current = null;
    } else {
      try {
        sc = await buildScenario(lang);
      } catch (e) {
        if (mountedRef.current) setError("Connection error — check your API key or internet connection.");
        setPhase("result"); // show result screen with error visible
        return;
      }
    }

    scenarioRef.current = sc;
    if (!mountedRef.current) return;
    setScenario(sc);
    setAvatarEmoji(pickEmoji(sc));

    setPhase("talking");
    await agentReply(sc, [], true);

    // Prefetch next scenario in background
    prefetchNext(langRef.current);
  }, [agentReply, prefetchNext]);

  // ── Mic / STT ──────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (isListening || isAgentSpeaking) return;

    // Resume AudioContext on this gesture (browser policy)
    getAudioCtx();

    // Always try MediaRecorder first (feeds ElevenLabs Scribe or Groq Whisper)
    const hasMediaRecorder = typeof MediaRecorder !== "undefined";
    const hasSTT = ELEVENLABS_KEY || GROQ_KEY;

    if (hasMediaRecorder && hasSTT) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec    = new MediaRecorder(stream);
        audioChunksRef.current = [];
        rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        rec.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          if (!mountedRef.current) return;
          setIsListening(false);
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const text = await transcribeBlob(blob, langRef.current);
          if (text.trim()) await handleUserMessage(text.trim());
        };
        mediaRecRef.current = rec;
        rec.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn("[mic] MediaRecorder failed, trying browser SR:", err);
      }
    }

    // Browser SpeechRecognition fallback
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Could not access microphone. Please allow mic access or type below.");
      return;
    }
    const rec = new SR();
    rec.lang             = LANG_LOCALE[langRef.current] ?? "en-US";
    rec.interimResults   = false;
    rec.maxAlternatives  = 1;
    browserSRRef.current = rec;
    setIsListening(true);
    rec.onresult = async (e: any) => {
      const text = (e.results[0]?.[0]?.transcript ?? "").trim();
      setIsListening(false);
      if (text && mountedRef.current) await handleUserMessage(text);
    };
    rec.onerror = () => { if (mountedRef.current) setIsListening(false); };
    rec.onend   = () => { if (mountedRef.current) setIsListening(false); };
    rec.start();
  }, [isListening, isAgentSpeaking, handleUserMessage]);

  const stopListening = useCallback(() => {
    mediaRecRef.current?.stop();
    browserSRRef.current?.stop();
  }, []);

  // ── Send typed text ────────────────────────────────────────────────────
  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isAgentSpeaking || isListening) return;
    // Resume AudioContext on first typed send too
    getAudioCtx();
    await handleUserMessage(text.trim());
  }, [isAgentSpeaking, isListening, handleUserMessage]);

  // ── End early ─────────────────────────────────────────────────────────
  const endConversation = useCallback(async () => {
    if (!scenarioRef.current || isAgentSpeaking) return;
    await finishConversation(messagesRef.current, scenarioRef.current);
  }, [isAgentSpeaking, finishConversation]);

  // ── Change language ────────────────────────────────────────────────────
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    langRef.current  = lang;
    queueRef.current = null;
    loadScenario(lang, false);
  }, [loadScenario]);

  // ── Next scenario ──────────────────────────────────────────────────────
  const nextScenario = useCallback(() => {
    loadScenario(langRef.current, true);
  }, [loadScenario]);

  // ── Boot: wait for user to unlock audio before starting ───────────────
  useEffect(() => {
    if (audioUnlocked) {
      loadScenario(langRef.current, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUnlocked]);

  return {
    phase, scenario, bgImage, avatarImage, avatarEmoji,
    messages, stars, feedback,
    isAgentSpeaking, isListening,
    language, nextReady, error,
    audioUnlocked, unlock,
    setLanguage, startListening, stopListening,
    sendText, endConversation, nextScenario,
  };
}
