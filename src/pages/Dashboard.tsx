import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Map, Shuffle, Flame, Star, LogOut, MessageSquare, Zap } from 'lucide-react'
import { useEffect } from 'react'

function getLevelProgress(xp: number) {
  const xpPerLevel = 500
  const level = Math.floor(xp / xpPerLevel) + 1
  const progress = ((xp % xpPerLevel) / xpPerLevel) * 100
  return { level, progress, xpInLevel: xp % xpPerLevel, xpPerLevel }
}

function getCEFRColor(cefr: string) {
  const colors: Record<string, string> = {
    A1: 'text-slate-400', A2: 'text-blue-400',
    B1: 'text-green-400', B2: 'text-yellow-400',
    C1: 'text-orange-400', C2: 'text-purple-400'
  }
  return colors[cefr] || 'text-slate-400'
}

export default function Dashboard() {
  const { user, profile, signOut, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'}}>
        <div className="text-purple-400 text-lg font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  const { level, progress, xpInLevel, xpPerLevel } = getLevelProgress(profile.xp)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'}}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center" style={{boxShadow: '0 0 15px rgba(124,58,237,0.5)'}}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-lg">DuoConnect</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{profile.streak}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-400 hover:text-white">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        {/* Welcome + XP */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-black text-white">Hey, {profile.username}! 👋</h1>
              <p className="text-slate-400 text-sm mt-1">Ready to practise today?</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-black text-lg">Lv.{level}</span>
              </div>
              <span className={`text-xs font-bold ${getCEFRColor(profile.cefr_level)}`}>{profile.cefr_level}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={progress} className="h-3 bg-slate-800" />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{xpInLevel} XP</span>
              <span>{xpPerLevel} XP to next level</span>
            </div>
          </div>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Card
            onClick={() => navigate('/modes/explorer')}
            className="cursor-pointer border-purple-800/50 bg-slate-900/60 backdrop-blur-sm hover:border-purple-500/70 transition-all duration-200 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0" style={{boxShadow: '0 0 20px rgba(124,58,237,0.4)'}}>
                  <Map className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-black text-xl">Explorer Mode</h2>
                  <p className="text-slate-400 text-sm mt-1">Browse and pick your scenario. Practice what you need most.</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">6 categories</span>
                    <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">You choose</span>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate('/modes/gauntlet')}
            className="cursor-pointer border-orange-800/50 bg-slate-900/60 backdrop-blur-sm hover:border-orange-500/70 transition-all duration-200 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0" style={{boxShadow: '0 0 20px rgba(245,158,11,0.4)'}}>
                  <Shuffle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-black text-xl">Gauntlet Mode</h2>
                  <p className="text-slate-400 text-sm mt-1">Random scenario thrown at you. Stay sharp, think fast.</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">Random</span>
                    <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">Surprise!</span>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-orange-400 group-hover:text-orange-300 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/60 rounded-2xl p-4 text-center border border-slate-800">
            <div className="text-2xl font-black text-white">{profile.xp}</div>
            <div className="text-xs text-slate-400 mt-1">Total XP</div>
          </div>
          <div className="bg-slate-900/60 rounded-2xl p-4 text-center border border-slate-800">
            <div className="text-2xl font-black text-orange-400">{profile.streak}</div>
            <div className="text-xs text-slate-400 mt-1">Day Streak</div>
          </div>
          <div className="bg-slate-900/60 rounded-2xl p-4 text-center border border-slate-800">
            <div className={`text-2xl font-black ${getCEFRColor(profile.cefr_level)}`}>{profile.cefr_level}</div>
            <div className="text-xs text-slate-400 mt-1">Level</div>
          </div>
        </div>
      </div>
    </div>
  )
}
