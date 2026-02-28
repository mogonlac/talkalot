import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mic, MicOff, Send, MessageSquare } from 'lucide-react'
import { SEED_SCENARIOS } from '@/data/scenarios'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const MAX_EXCHANGES = 6

export default function Conversation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const scenario = SEED_SCENARIOS.find(s => s.id === id)

  useEffect(() => {
    if (!scenario) return
    // Start with the AI's opening line
    setMessages([{ role: 'assistant', content: scenario.opening_line }])
    setSessionStarted(true)
  }, [scenario])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (exchangeCount >= MAX_EXCHANGES && exchangeCount > 0) {
      // End session - go to results
      setTimeout(() => {
        navigate('/results', { state: { messages, scenario } })
      }, 500)
    }
  }, [exchangeCount])

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-white text-center">
          <p className="text-xl font-bold mb-4">Scenario not found</p>
          <Button onClick={() => navigate('/modes/explorer')} className="bg-purple-600 hover:bg-purple-700">Back to Explorer</Button>
        </div>
      </div>
    )
  }

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return
    setLoading(true)

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')

    try {
      const systemPrompt = `You are ${scenario.character_name}, a ${scenario.character_role}. 
Personality: ${scenario.character_personality}
Mood: ${scenario.character_mood}
Accent/Style: ${scenario.character_accent}
Context: ${scenario.context}

Stay completely in character. Keep responses short (1-3 sentences max). Be realistic and immersive. 
This is exchange ${exchangeCount + 1} of ${MAX_EXCHANGES}. ${exchangeCount >= MAX_EXCHANGES - 1 ? 'This is the last exchange, wrap up the conversation naturally.' : ''}`

      const history = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: history,
            generationConfig: { maxOutputTokens: 150, temperature: 0.8 }
          })
        }
      )

      const data = await response.json()
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "..."

      setMessages(prev => [...prev, { role: 'assistant', content: aiText }])
      setExchangeCount(prev => prev + 1)

      // ElevenLabs TTS
      speakText(aiText)
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I didn't catch that." }])
    }
    setLoading(false)
  }

  const speakText = async (text: string) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
    if (!apiKey) return
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
    } catch (err) {
      console.error('TTS error:', err)
    }
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const handleEnd = () => {
    navigate('/results', { state: { messages, scenario } })
  }

  const progress = (exchangeCount / MAX_EXCHANGES) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-900/30 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modes/explorer')} className="text-slate-400 hover:text-white p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{scenario.character_name}</p>
              <p className="text-slate-400 text-xs truncate">{scenario.character_role}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400">{exchangeCount}/{MAX_EXCHANGES}</div>
          <Button variant="ghost" size="sm" onClick={handleEnd} className="text-slate-400 hover:text-red-400 text-xs">
            End
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scenario context */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/50 flex-shrink-0">
        <p className="text-slate-400 text-xs text-center">{scenario.context}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-md'
                  : 'bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700'
              }`}
            >
              {msg.role === 'assistant' && (
                <p className="text-xs text-slate-400 font-bold mb-1">{scenario.character_name}</p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-4 border-t border-purple-900/30 flex-shrink-0 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <button
            onMouseDown={startListening}
            onMouseUp={() => { if (listening) stopListening() }}
            onTouchStart={startListening}
            onTouchEnd={() => { if (listening) stopListening() }}
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              listening
                ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {listening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-slate-300" />}
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={listening ? 'Listening...' : 'Type or hold mic to speak...'}
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-all"
            style={{ boxShadow: input.trim() ? '0 0 15px rgba(124,58,237,0.4)' : 'none' }}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">Hold mic to speak • Type to respond</p>
      </div>
    </div>
  )
}
