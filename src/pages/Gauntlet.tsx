import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shuffle, Zap } from 'lucide-react'
import { SEED_SCENARIOS } from '@/data/scenarios'

export default function Gauntlet() {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)
  const [selectedCount, setSelectedCount] = useState<number | null>(null)

  const launchGauntlet = (count: number) => {
    setLaunching(true)
    // Pick random scenarios
    const shuffled = [...SEED_SCENARIOS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count).map(s => s.id)
    setTimeout(() => {
      navigate(`/gauntlet/play`, { state: { scenarioIds: selected, total: count } })
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-900/30">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(245,158,11,0.5)' }}>
            <Shuffle className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-lg">Gauntlet Mode</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">How many rounds?</h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Back-to-back scenarios, no breaks. One score at the end.
          </p>
        </div>

        {/* Round selector */}
        {!launching && (
          <div className="flex gap-4">
            {[3, 5, 10].map(count => (
              <button
                key={count}
                onClick={() => { setSelectedCount(count); launchGauntlet(count) }}
                className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 font-black text-white transition-all active:scale-95 border-2 ${
                  selectedCount === count
                    ? 'border-orange-400 scale-105'
                    : 'border-orange-500/40 hover:border-orange-400/70'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b22, #ef444422)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2)'
                }}
              >
                <span className="text-4xl font-black">{count}</span>
                <span className="text-xs text-orange-300 font-medium">
                  {count === 3 ? 'Quick' : count === 5 ? 'Medium' : 'Epic'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Launching state */}
        {launching && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-32 h-32 rounded-full flex flex-col items-center justify-center animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                boxShadow: '0 0 60px rgba(245,158,11,0.8)',
              }}
            >
              <Zap className="w-12 h-12 text-white" />
            </div>
            <p className="text-orange-300 font-bold text-lg">Get ready...</p>
          </div>
        )}

        {/* Info pills */}
        {!launching && (
          <div className="flex flex-wrap gap-2 justify-center max-w-xs">
            <span className="text-xs bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700">🎲 Random scenarios</span>
            <span className="text-xs bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700">⚡ No breaks</span>
            <span className="text-xs bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700">📊 One final score</span>
          </div>
        )}
      </div>
    </div>
  )
}
