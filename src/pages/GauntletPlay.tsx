import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mic, MicOff, Zap, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SEED_SCENARIOS, CHARACTER_VOICES } from '@/data/scenarios'
import { getScenarioImages, preloadScenarioImages } from '@/lib/imageCache'
import { playAudio, stopAudio, speakWithBrowserTTS } from '@/lib/audioManager'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ScenarioSession {
  scenario: typeof SEED_SCENARIOS[0]
  messages: Message[]
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || ''
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const EXCHANGES_PER_SCENARIO = 4

const CHARACTER_GRADIENTS = [
  'from-purple-600 to-indigo-600',
  'from-orange-500 to-red-500',
  'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-blue-500 to-cyan-500',
  'from-yellow-500 to-amber-500',
]


export default function GauntletPlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const { scenarioIds, total } = location.state || { scenarioIds: [], total: 3 }

  const scenarios = scenarioIds
    .map((id: string) => SEED_SCENARIOS.find(s => s.id === id))
    .filter(Boolean) as typeof SEED_SCENARIOS

  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [sessions, setSessions] = useState<ScenarioSession[]>([])
  const [transitioning, setTransitioning] = useState(false)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [input, setInput] = useState('')
  const [userSubtitle, setUserSubtitle] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const currentScenario = scenarios[currentScenarioIndex]
  const scenarioGradient = CHARACTER_GRADIENTS[currentScenarioIndex % CHARACTER_GRADIENTS.length]

  useEffect(() => {
    if (!currentScenario) return
    stopAudio() // Stop previous scenario's audio
    startScenario(currentScenario)
    return () => stopAudio() // Stop on unmount
  }, [currentScenarioIndex])

  const startScenario = (scenario: typeof SEED_SCENARIOS[0]) => {
    setMessages([{ role: 'assistant', content: scenario.opening_line }])
    setExchangeCount(0)
    setBgImage(null)
    setAvatarImage(null)

    // Speak opening line immediately — don't wait for images
    setTimeout(() => speakText(scenario.opening_line), 300)

    // Load images non-blocking — fade in when ready
    const cached = getScenarioImages(scenario.id)
    if (cached) {
      if (cached.bg) setBgImage(cached.bg)
      if (cached.avatar) setAvatarImage(cached.avatar)
    } else {
      // Generate in background, update when done
      preloadScenarioImages(scenario.id).then(() => {
        const images = getScenarioImages(scenario.id)
        if (images?.bg) setBgImage(images.bg)
        if (images?.avatar) setAvatarImage(images.avatar)
      })
    }
  }

  const advanceToNextScenario = (finalMessages: Message[]) => {
    // Save current session
    const newSession: ScenarioSession = { scenario: currentScenario, messages: finalMessages }
    const updatedSessions = [...sessions, newSession]
    setSessions(updatedSessions)

    if (currentScenarioIndex + 1 >= scenarios.length) {
      // All done — go to results
      navigate('/results', { state: { sessions: updatedSessions, isGauntlet: true } })
      return
    }

    // Seamless transition to next scenario
    setTransitioning(true)
    setTimeout(() => {
      setCurrentScenarioIndex(prev => prev + 1)
      setTransitioning(false)
    }, 600)
  }

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading || !currentScenario) return
    setLoading(true)
    setShowInput(false)
    setInput('')
    setUserSubtitle(userMessage)

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      const systemPrompt = `You are ${currentScenario.character_name}, a ${currentScenario.character_role}. 
Personality: ${currentScenario.character_personality}
Mood: ${currentScenario.character_mood}
Style: ${currentScenario.character_accent}

Mission context: ${currentScenario.context}

Stay completely in character at all times. React naturally to what the user says — make them work for their goal. Keep responses short (1-2 sentences max). Be realistic and immersive. Do NOT break character or acknowledge this is a language exercise.
This is exchange ${exchangeCount + 1} of ${EXCHANGES_PER_SCENARIO}.${exchangeCount >= EXCHANGES_PER_SCENARIO - 1 ? ' This is the last exchange, wrap up naturally.' : ''}`

      const conversationHistory = newMessages
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory],
          max_tokens: 100,
          temperature: 0.8
        })
      })

      const data = await response.json()
      const aiText = data.choices?.[0]?.message?.content || "I see."
      const finalMessages = [...newMessages, { role: 'assistant' as const, content: aiText }]
      setMessages(finalMessages)
      const newExchangeCount = exchangeCount + 1
      setExchangeCount(newExchangeCount)
      setTimeout(() => setUserSubtitle(null), 2000)
      await speakText(aiText)

      // Auto advance after last exchange
      if (newExchangeCount >= EXCHANGES_PER_SCENARIO) {
        setTimeout(() => advanceToNextScenario(finalMessages), 1500)
      }
    } catch (err) {
      console.error('Send error:', err)
    }
    setLoading(false)
  }

  const speakText = async (text: string): Promise<void> => {
    if (!ELEVENLABS_API_KEY) {
      // Fallback to browser TTS if no API key
      await speakWithBrowserTTS(text)
      return
    }
    const voiceId = currentScenario ? (CHARACTER_VOICES[currentScenario.character_name] || 'JBFqnCBsd6RMkjVDRZzb') : 'JBFqnCBsd6RMkjVDRZzb'
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      })
      if (!response.ok) {
        // Fallback to browser TTS if API fails
        console.warn('ElevenLabs API failed, using browser TTS fallback')
        await speakWithBrowserTTS(text)
        return
      }
      const arrayBuffer = await response.arrayBuffer()
      await playAudio(arrayBuffer)
    } catch (err) {
      console.error('TTS error:', err)
      // Fallback to browser TTS on error
      await speakWithBrowserTTS(text)
    }
  }

  const toggleListening = async () => {
    if (listening) {
      mediaRecorderRef.current?.stop()
      setListening(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeWithGroq(audioBlob)
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setListening(true)
    } catch (err) {
      alert('Could not access microphone.')
    }
  }

  const transcribeWithGroq = async (audioBlob: Blob) => {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: formData
      })
      const data = await response.json()
      if (data.text) await sendMessage(data.text)
    } catch (err) { console.error('Transcription error:', err) }
    setTranscribing(false)
  }

  if (!currentScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <p className="text-white">No scenarios found</p>
      </div>
    )
  }

  const lastMessage = messages[messages.length - 1]
  const overallProgress = ((currentScenarioIndex) / total) * 100
  const scenarioProgress = (exchangeCount / EXCHANGES_PER_SCENARIO) * 100

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden relative transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`} style={{ background: '#0a0a0f' }}>

      {/* Background gradient */}
      {bgImage && (
        <div className="absolute inset-0 z-0" style={{ background: bgImage, opacity: 0.3 }} />
      )}
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.98) 100%)' }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
        <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-3">
          {/* Scenario dots */}
          <div className="flex gap-1.5">
            {scenarios.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < currentScenarioIndex ? 'w-4 bg-orange-400' : i === currentScenarioIndex ? 'w-6 bg-orange-400 animate-pulse' : 'w-4 bg-white/20'}`} />
            ))}
          </div>
          <span className="text-white/60 text-xs font-bold">{currentScenarioIndex + 1}/{total}</span>
        </div>
        <div className="flex flex-col items-center">
          <button onClick={() => advanceToNextScenario(messages)} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors">
            <Zap className="w-4 h-4 text-yellow-400" />
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1">Skip</p>
        </div>
      </div>

      {/* Scenario progress bar */}
      <div className="relative z-20 mx-5 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-red-400 transition-all duration-500 rounded-full" style={{ width: `${scenarioProgress}%` }} />
      </div>

      {/* Character portrait */}
      <div className="relative z-20 flex flex-col items-center pt-6 pb-4 flex-shrink-0">
        <div className="relative">
          <div 
            className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl border-2 border-orange-500/60 ring-2 ring-orange-300/40 ${loading ? 'animate-pulse' : ''}`}
            style={{ 
              background: bgImage || scenarioGradient,
              boxShadow: '0 0 40px rgba(245,158,11,0.4)' 
            }}
          >
            {avatarImage || '🎭'}
          </div>
          {loading && <div className="absolute inset-0 rounded-full border-2 border-orange-400 animate-ping opacity-60" />}
        </div>
        <h2 className="text-white font-black text-lg mt-3">{currentScenario.character_name}</h2>
        <p className="text-slate-400 text-xs">{currentScenario.character_role}</p>
      </div>

      {/* Latest message - centre stage */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6">
        {lastMessage?.role === 'assistant' && (
          <p className="text-white text-xl font-medium leading-relaxed text-center" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            "{lastMessage.content}"
          </p>
        )}
        {lastMessage?.role === 'user' && (
          <div className="text-center space-y-3">
            <div className="bg-orange-600/20 border border-orange-500/30 rounded-2xl px-5 py-3 backdrop-blur-sm">
              <p className="text-orange-200 text-sm">You said:</p>
              <p className="text-white font-medium mt-1">"{lastMessage.content}"</p>
            </div>
            {loading && (
              <div className="flex gap-1 items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* User subtitle */}
      <div className={`relative z-20 px-6 mb-3 flex-shrink-0 transition-all duration-300 ${userSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl rounded-br-md px-4 py-2.5 shadow-lg">
            <p className="text-white/50 text-xs font-semibold mb-0.5 uppercase tracking-wide">You</p>
            <p className="text-white font-medium text-sm leading-snug">{userSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 px-6 pb-10 flex-shrink-0 bg-black/20 backdrop-blur-sm rounded-t-3xl">
        {showInput && (
          <div className="flex items-center gap-2 mb-4">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
              placeholder="Type your response..."
              autoFocus
              className="flex-1 bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 backdrop-blur-sm"
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setShowInput(!showInput)} className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <span className="text-lg">⌨️</span>
          </button>

          <button
            onClick={toggleListening}
            disabled={loading || transcribing}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 hover:scale-105 transition-transform duration-150 ${
              listening ? 'bg-red-500 scale-110' : transcribing ? 'bg-yellow-500' : 'bg-orange-500 hover:bg-orange-400 active:scale-95'
            }`}
            style={{ boxShadow: listening ? '0 0 40px rgba(239,68,68,0.6)' : transcribing ? '0 0 40px rgba(234,179,8,0.6)' : '0 0 30px rgba(245,158,11,0.5)' }}
          >
            {transcribing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : listening ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          <div className="w-12 h-12" />
        </div>

        <p className="text-center text-xs text-slate-600 mt-3">
          {listening ? '🔴 Recording — tap to stop' : transcribing ? '⏳ Transcribing...' : 'Tap mic to speak'}
        </p>
      </div>
    </div>
  )
}