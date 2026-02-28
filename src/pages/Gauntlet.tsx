import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shuffle, Zap } from 'lucide-react'
import { SEED_SCENARIOS } from '@/data/scenarios'
import Mascot from '@/components/Mascot'

export default function Gauntlet() {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const launchGauntlet = (count: number) => {
    setLaunching(true)
    const shuffled = [...SEED_SCENARIOS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count).map(s => s.id)
    setTimeout(() => {
      navigate('/gauntlet/play', { state: { scenarioIds: selected, total: count } })
    }, 600)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gauntlet Mode</h1>
          <p className="text-slate-400 text-sm">Back-to-back. No breaks.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {!launching ? (
          <>
            <Mascot className="w-40 h-auto" />
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 mb-2">How many rounds?</h2>
              <p className="text-slate-400 text-sm">One score at the very end.</p>
            </div>

            <div className="flex gap-4">
              {[3, 5, 10].map(count => (
                <button
                  key={count}
                  onClick={() => launchGauntlet(count)}
                  className="w-24 h-28 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 active:scale-95 transition-all"
                >
                  <span className="text-4xl font-black text-orange-500">{count}</span>
                  <span className="text-xs text-orange-400 font-bold">{count === 3 ? 'Quick' : count === 5 ? 'Medium' : 'Epic'}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">🎲 Random scenarios</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">⚡ No breaks</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">📊 One final score</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <Zap className="w-16 h-16 text-white" />
            </div>
            <p className="text-orange-500 font-black text-2xl">Get ready...</p>
          </div>
        )}
      </div>
    </div>
  )
}
