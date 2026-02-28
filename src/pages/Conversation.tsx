import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, X, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SEED_SCENARIOS, CHARACTER_VOICES } from '@/data/scenarios'
import { getScenarioImages, preloadScenarioImages } from '@/lib/imageCache'
import { playAudio, stopAudio } from '@/lib/audioManager'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || ''
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const MAX_EXCHANGES = 6

const CHARACTER_GRADIENTS = [
  'from-purple-600 to-indigo-600',
  'from-orange-500 to-red-500',
  'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-blue-500 to-cyan-500',
  'from-yellow-500 to-amber-500',
]


export default function Conversation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [imagesLoading, setImagesLoading] = useState(true)
  const [showInput, setShowInput] = useState(false)
  const [userSubtitle, setUserSubtitle] = useState<string | null>(null)
  const subtitleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const scenario = SEED_SCENARIOS.find(s => s.id === id)
  const scenarioIndex = SEED_SCENARIOS.findIndex(s => s.id === id)
  const gradient = CHARACTER_GRADIENTS[scenarioIndex % CHARACTER_GRADIENTS.length]

  useEffect(() => {
    if (!scenario) return
    setMessages([{ role: 'assistant', content: scenario.opening_line }])
    generateImages()
    setTimeout(() => speakText(scenario.opening_line), 500)
    // Stop audio when leaving the screen
    return () => stopAudio()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (exchangeCount >= MAX_EXCHANGES && exchangeCount > 0) {
      setTimeout(() => {
        navigate('/results', { state: { messages, scenario } })
      }, 1000)
    }
  }, [exchangeCount])

  const generateImages = () => {
    if (!scenario) return
    // Check cache first — instant if warm
    const cached = getScenarioImages(scenario.id)
    if (cached) {
      if (cached.bg) setBgImage(cached.bg)
      if (cached.avatar) setAvatarImage(cached.avatar)
      setImagesLoading(false)
      return
    }
    // Not cached — generate in background, fade in when ready
    setImagesLoading(true)
    preloadScenarioImages(scenario.id).then(() => {
      const images = getScenarioImages(scenario.id)
      if (images?.bg) setBgImage(images.bg)
      if (images?.avatar) setAvatarImage(images.avatar)
      setImagesLoading(false)
    })
  }

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-white text-center">
          <p className="text-xl font-bold mb-4">Scenario not found</p>
          <button onClick={() => navigate('/modes/explorer')} className="bg-purple-600 px-4 py-2 rounded-xl text-white font-bold">Back</button>
        </div>
      </div>
    )
  }

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return
    setLoading(true)
    setShowInput(false)
    setInput('')

    // Show user subtitle immediately
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current)
    setUserSubtitle(userMessage)

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      // Read language fresh from Supabase to avoid stale cache
      let targetLanguage = profile?.target_language || 'Spanish'
      if (user) {
        const { data: freshProfile } = await supabase.from('profiles').select('target_language').eq('id', user.id).single()
        if (freshProfile?.target_language) targetLanguage = freshProfile.target_language
      }
      console.log('🌍 Using language:', targetLanguage)
      const systemPrompt = `You are ${scenario.character_name}, a ${scenario.character_role}. 
Personality: ${scenario.character_personality}
Mood: ${scenario.character_mood}
Style: ${scenario.character_accent}

Mission context: ${scenario.context}

IMPORTANT: You MUST respond ONLY in ${targetLanguage}. The user is learning ${targetLanguage} - they will speak to you in ${targetLanguage} and you must reply in ${targetLanguage} only. Never switch to English.

Stay completely in character at all times. React naturally to what the user says — make them work for their goal. Keep responses short (1-3 sentences max). Be realistic and immersive. Do NOT break character or acknowledge this is a language exercise.
This is exchange ${exchangeCount + 1} of ${MAX_EXCHANGES}.${exchangeCount >= MAX_EXCHANGES - 1 ? ' This is the last exchange, wrap up naturally.' : ''}`

      const conversationHistory = newMessages
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory],
          max_tokens: 150,
          temperature: 0.8
        })
      })

      const data = await response.json()
      const aiText = data.choices?.[0]?.message?.content || "I didn't quite catch that."
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }])
      setExchangeCount(prev => prev + 1)
      // Keep user subtitle visible for at least 2 seconds after AI responds
      setTimeout(() => setUserSubtitle(null), 2000)
      speakText(aiText)
    } catch (err) {
      console.error('Send error:', err)
    }
    setLoading(false)
  }

  const speakText = async (text: string) => {
    if (!ELEVENLABS_API_KEY) return
    const voiceId = scenario ? (CHARACTER_VOICES[scenario.character_name] || 'JBFqnCBsd6RMkjVDRZzb') : 'JBFqnCBsd6RMkjVDRZzb'
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      })
      if (!response.ok) return
      const arrayBuffer = await response.arrayBuffer()
      await playAudio(arrayBuffer)
    } catch (err) { console.error('TTS error:', err) }
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
      console.error('Mic error:', err)
      alert('Could not access microphone.')
    }
  }

  const transcribeWithGroq = async (audioBlob: Blob) => {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-large-v3')
      const langCodes: Record<string, string> = {
        'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Japanese': 'ja',
        'Mandarin': 'zh', 'Italian': 'it', 'Portuguese': 'pt', 'Arabic': 'ar',
        'Korean': 'ko', 'Hindi': 'hi', 'English': 'en'
      }
      formData.append('language', langCodes[profile?.target_language || 'English'] || 'en')
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: formData
      })
      const data = await response.json()
      if (data.text) {
        // Auto send after voice transcription
        await sendMessage(data.text)
      }
    } catch (err) { console.error('Transcription error:', err) }
    setTranscribing(false)
  }

  const lastMessage = messages[messages.length - 1]
  const progress = (exchangeCount / MAX_EXCHANGES) * 100

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative" style={{ background: '#0a0a0f' }}>

      {/* Full screen background image */}
      {bgImage ? (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25
          }}
        />
      ) : imagesLoading ? (
        <div className="absolute inset-0 z-0 animate-pulse" style={{ background: 'linear-gradient(135deg, #1a0533, #0a1a3d)' }} />
      ) : null}

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)' }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
        <button onClick={() => navigate('/modes/explorer')} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-white text-xs font-bold">{exchangeCount}/{MAX_EXCHANGES}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-20 mx-5 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500 rounded-full" 
          style={{ 
            width: `${progress}%`,
            boxShadow: progress > 0 ? '0 0 8px rgba(124,58,237,0.5)' : 'none'
          }} 
        />
      </div>

      {/* Character portrait — center top */}
      <div className="relative z-20 flex flex-col items-center pt-6 pb-4 flex-shrink-0">
        {avatarImage ? (
          <div className="relative">
            <img
              src={avatarImage}
              alt={scenario.character_name}
              className={`w-28 h-28 rounded-full object-cover border-2 border-purple-500/60 ring-2 ring-white/30 ${!loading && lastMessage?.role === 'assistant' ? 'ring-4 ring-white/60 animate-pulse' : ''}`}
              style={{ boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}
            />
            {loading && (
              <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-60" />
            )}
          </div>
        ) : (
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-4xl`}
            style={{ boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
          >
            {imagesLoading ? <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🎭'}
          </div>
        )}
        <h2 className="text-white font-black text-lg mt-3">{scenario.character_name}</h2>
        <p className="text-slate-400 text-xs">{scenario.character_role}</p>
      </div>

      {/* Mission banner */}
      <div className="relative z-20 mx-5 mb-2 flex-shrink-0">
        <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 backdrop-blur-sm">
          <p className="text-purple-300 text-[11px] leading-relaxed">{scenario.context}</p>
        </div>
      </div>

      {/* Latest AI message — big, center stage */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6">
        {lastMessage?.role === 'assistant' && !loading && (
          <div key={lastMessage.content} className="animate-in fade-in duration-500 text-center">
            <p className="text-white text-xl font-medium leading-relaxed" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              "{lastMessage.content}"
            </p>
          </div>
        )}
        {loading && (
          <div className="flex gap-1.5 items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* User subtitle — hovers above input, fades in/out */}
      <div className={`relative z-20 px-6 mb-3 flex-shrink-0 transition-all duration-300 ${userSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl rounded-br-md px-4 py-2.5 shadow-lg">
            <p className="text-white/50 text-xs font-semibold mb-0.5 uppercase tracking-wide">You</p>
            <p className="text-white font-medium text-sm leading-snug">{userSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 px-6 pb-10 flex-shrink-0">
        {/* Type input — slides up when needed */}
        {showInput && (
          <div className="flex items-center gap-2 mb-4">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
              placeholder="Type your response..."
              autoFocus
              className="flex-1 bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 backdrop-blur-sm"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Main mic button + type toggle */}
        <div className="flex items-center justify-center gap-6">
          {/* Type toggle */}
          <button
            onClick={() => setShowInput(!showInput)}
            className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <span className="text-lg">⌨️</span>
          </button>

          {/* BIG mic button */}
          <button
            onClick={toggleListening}
            disabled={loading || transcribing}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 transition-transform duration-150 ${
              listening
                ? 'bg-red-500 scale-110'
                : transcribing
                ? 'bg-yellow-500 scale-100'
                : 'bg-purple-600 hover:bg-purple-500 hover:scale-105 active:scale-95'
            }`}
            style={{
              boxShadow: listening
                ? '0 0 40px rgba(239,68,68,0.6)'
                : transcribing
                ? '0 0 40px rgba(234,179,8,0.6)'
                : '0 0 30px rgba(124,58,237,0.5)'
            }}
          >
            {transcribing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : listening ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          {/* End session */}
          <button
            onClick={() => navigate('/results', { state: { messages, scenario } })}
            className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-sm flex items-center justify-center"
          >
            <Zap className="w-5 h-5 text-yellow-400" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-3 tracking-wide">
          {listening ? '🔴 Recording — tap to stop' : transcribing ? '⏳ Transcribing...' : 'Tap mic to speak'}
        </p>
      </div>

      <div ref={messagesEndRef} />
    </div>
  )
}
