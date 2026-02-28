import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Zap, RotateCcw, Home, Star, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''

interface ScoreResult {
  grammar: number
  vocabulary: number
  fluency: number
  overall: number
  advice: string
  xp: number
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{value}/100</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [scores, setScores] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [xpAnimated, setXpAnimated] = useState(false)

  const { messages, scenario } = location.state || {}

  useEffect(() => {
    if (!messages || !scenario) {
      navigate('/dashboard')
      return
    }
    assessConversation()
  }, [])

  const assessConversation = async () => {
    setLoading(true)
    try {
      const userMessages = (messages as Message[]).filter(m => m.role === 'user').map(m => m.content).join('\n')

      const prompt = `You are an English language assessment expert. Assess this user's English speaking performance in a conversation scenario.

Scenario: ${scenario.title}
User's responses:
${userMessages}

Rate the user on a scale of 0-100 for:
1. Grammar accuracy
2. Vocabulary range
3. Fluency and naturalness

Give ONE short, sharp piece of advice (max 15 words) that will most help them improve.

Respond ONLY in this exact JSON format:
{
  "grammar": <number>,
  "vocabulary": <number>,
  "fluency": <number>,
  "advice": "<one short advice sentence>"
}`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3
        })
      })

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { grammar: 70, vocabulary: 70, fluency: 70, advice: 'Keep practising!' }

      const overall = Math.round((parsed.grammar + parsed.vocabulary + parsed.fluency) / 3)
      const xp = Math.round(overall * 0.5) + 10

      const result: ScoreResult = {
        grammar: parsed.grammar,
        vocabulary: parsed.vocabulary,
        fluency: parsed.fluency,
        overall,
        advice: parsed.advice,
        xp
      }

      setScores(result)
      speakAdvice(parsed.advice)
      await saveSession(result)
      setTimeout(() => setXpAnimated(true), 500)
    } catch (err) {
      console.error(err)
      const fallback: ScoreResult = { grammar: 70, vocabulary: 70, fluency: 70, overall: 70, advice: 'Keep practising regularly!', xp: 45 }
      setScores(fallback)
      setTimeout(() => setXpAnimated(true), 500)
    }
    setLoading(false)
  }

  const speakAdvice = async (text: string) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
    if (!apiKey) return
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true }
        })
      })
      if (!response.ok) return
      const blob = await response.blob()
      new Audio(URL.createObjectURL(blob)).play()
    } catch (err) {
      console.error('TTS error:', err)
    }
  }

  const saveSession = async (result: ScoreResult) => {
    if (!user || !scenario) return
    try {
      // Update XP and streak in Supabase
      const newXp = (profile?.xp || 0) + result.xp
      const newLevel = Math.floor(newXp / 500) + 1
      const today = new Date().toISOString().split('T')[0]
      const lastPlayed = profile?.last_played_at?.split('T')[0]
      const newStreak = lastPlayed === new Date(Date.now() - 86400000).toISOString().split('T')[0]
        ? (profile?.streak || 0) + 1
        : lastPlayed === today ? profile?.streak || 0 : 1

      // Update ELO (hidden)
      const eloChange = result.overall > 75 ? 15 : result.overall > 50 ? 5 : -10
      const newElo = Math.max(0, (profile?.elo || 1000) + eloChange)

      // Update CEFR
      const cefr = newElo > 2000 ? 'C2' : newElo > 1600 ? 'C1' : newElo > 1300 ? 'B2' : newElo > 1100 ? 'B1' : newElo > 900 ? 'A2' : 'A1'

      await supabase.from('profiles').update({
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        last_played_at: new Date().toISOString(),
        elo: newElo,
        cefr_level: cefr
      }).eq('id', user.id)

      await supabase.from('sessions').insert({
        user_id: user.id,
        scenario_id: scenario.id,
        xp_earned: result.xp,
        grammar_score: result.grammar,
        vocabulary_score: result.vocabulary,
        fluency_score: result.fluency,
        overall_score: result.overall,
        elo_change: eloChange,
        ai_advice: result.advice,
        transcript: messages
      })

      await refreshProfile()
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="w-16 h-16 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
        <p className="text-purple-300 font-bold text-lg animate-pulse">AI is assessing your performance...</p>
      </div>
    )
  }

  if (!scores) return null

  const getOverallEmoji = (score: number) => {
    if (score >= 85) return '🔥'
    if (score >= 70) return '⭐'
    if (score >= 55) return '👍'
    return '💪'
  }

  const getOverallLabel = (score: number) => {
    if (score >= 85) return 'Excellent!'
    if (score >= 70) return 'Good job!'
    if (score >= 55) return 'Not bad!'
    return 'Keep going!'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full flex flex-col gap-6">
        {/* Score Hero */}
        <div className="text-center">
          <div className="text-6xl mb-2">{getOverallEmoji(scores.overall)}</div>
          <h1 className="text-4xl font-black text-white mb-1">{scores.overall}<span className="text-slate-400 text-2xl">/100</span></h1>
          <p className="text-purple-300 font-bold text-lg">{getOverallLabel(scores.overall)}</p>
        </div>

        {/* XP Badge */}
        <div className={`flex items-center justify-center gap-2 transition-all duration-700 ${xpAnimated ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 px-5 py-2 rounded-full">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-black text-xl">+{scores.xp} XP</span>
          </div>
        </div>

        {/* Score Breakdown */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Score Breakdown
            </h2>
            <ScoreBar label="Grammar" value={scores.grammar} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
            <ScoreBar label="Vocabulary" value={scores.vocabulary} color="bg-gradient-to-r from-purple-500 to-pink-400" />
            <ScoreBar label="Fluency" value={scores.fluency} color="bg-gradient-to-r from-green-500 to-emerald-400" />
          </CardContent>
        </Card>

        {/* AI Advice */}
        <Card className="border-purple-800/50 bg-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">AI Advice</p>
                <p className="text-white font-medium text-sm leading-relaxed">"{scores.advice}"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pb-4">
          <Button
            onClick={() => navigate(`/scenario/${scenario?.id}`)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-base"
            style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => navigate('/modes/explorer')}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 h-12 text-base"
          >
            New Scenario
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="w-full text-slate-500 hover:text-slate-300 h-10"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
