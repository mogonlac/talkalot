import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Flame, Star, Shuffle, Map, LogOut, Zap, Trophy } from 'lucide-react'
import Mascot from '@/components/Mascot'

function getLevelProgress(xp: number) {
  const xpPerLevel = 500
  const level = Math.floor(xp / xpPerLevel) + 1
  const progress = ((xp % xpPerLevel) / xpPerLevel) * 100
  const xpInLevel = xp % xpPerLevel
  return { level, progress, xpInLevel, xpPerLevel }
}

function getCEFRColor(cefr: string) {
  const colors: Record<string, string> = {
    A1: '#94a3b8', A2: '#60a5fa',
    B1: '#34d399', B2: '#fbbf24',
    C1: '#f97316', C2: '#a855f7'
  }
  return colors[cefr] || '#94a3b8'
}

export default function Dashboard() {
  const { user, profile, signOut, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Mascot className="w-32 h-auto animate-bounce" />
          <p className="text-violet-600 font-black text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  const { level, progress, xpInLevel, xpPerLevel } = getLevelProgress(profile.xp)
  const cefrColor = getCEFRColor(profile.cefr_level)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-1.5 bg-violet-600 w-full" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">Good day,</p>
          <h1 className="text-2xl font-black text-slate-900"><span className="inline-block animate-bounce" style={{animationDuration: '1.5s'}}>👋</span> {profile.username}</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-6 mb-6">
        <div className="flex-1 bg-orange-50 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="text-xl font-black text-orange-500">{profile.streak}</p>
            <p className="text-xs text-orange-400 font-medium">Day streak</p>
          </div>
        </div>
        <div className="flex-1 bg-violet-50 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
          <Star className="w-5 h-5 text-violet-500" />
          <div>
            <p className="text-xl font-black text-violet-500">{profile.xp}</p>
            <p className="text-xs text-violet-400 font-medium">Total XP</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm" style={{ background: `${cefrColor}18` }}>
          <Trophy className="w-5 h-5" style={{ color: cefrColor }} />
          <div>
            <p className="text-xl font-black" style={{ color: cefrColor }}>{profile.cefr_level}</p>
            <p className="text-xs font-medium" style={{ color: cefrColor + '99' }}>Level</p>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-6 mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span className="font-bold text-slate-600">Level {level}</span>
          <span>{xpInLevel} / {xpPerLevel} XP</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
          >
            {progress > 15 && <span className="text-xs font-bold text-white">{level}</span>}
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100 mx-6 mb-4" />

      {/* Mascot — centre piece */}
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <div className="relative mb-6 shadow-sm">
          <Mascot className="w-48 h-auto" />
          {/* Speech bubble */}
          <div className="absolute -top-2 -right-4 bg-violet-600 text-white text-xs font-black px-3 py-2 rounded-2xl rounded-bl-none max-w-32 text-center leading-tight shadow-lg">
            Let's practise! 🎤
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 text-center mb-1">Pick your mode</h2>
        <p className="text-slate-400 text-sm text-center mb-8">Speak to AI characters. Level up your English.</p>

        {/* Mode buttons */}
        <div className="w-full max-w-sm space-y-3">
          {/* Explorer Mode */}
          <button
            onClick={() => navigate('/modes/explorer')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md active:shadow-none"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-black text-slate-900 text-base">Explorer Mode</p>
              <p className="text-slate-500 text-xs">Browse & pick your scenario</p>
            </div>
            <div className="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded-full">YOU CHOOSE</div>
          </button>

          {/* Gauntlet Mode */}
          <button
            onClick={() => navigate('/modes/gauntlet')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md active:shadow-none"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Shuffle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-black text-slate-900 text-base">Gauntlet Mode</p>
              <p className="text-slate-500 text-xs">Random scenarios, no breaks</p>
            </div>
            <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">RANDOM</div>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-10" />
      <p className="text-center text-slate-200 text-xs pb-4">Talkalot v1.0</p>
    </div>
  )
}
