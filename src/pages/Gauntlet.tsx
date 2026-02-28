import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shuffle, Zap, MessageSquare } from 'lucide-react'
import { SEED_SCENARIOS, SCENARIO_CATEGORIES } from '@/data/scenarios'
import { useState } from 'react'

export default function Gauntlet() {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const launchRandom = () => {
    setLaunching(true)
    setTimeout(() => {
      const random = SEED_SCENARIOS[Math.floor(Math.random() * SEED_SCENARIOS.length)]
      navigate(`/scenario/${random.id}`)
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Big launch button */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">Are you ready?</h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            A random scenario will be thrown at you. Stay sharp, think fast.
          </p>
        </div>

        <button
          onClick={launchRandom}
          disabled={launching}
          className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-300 font-black text-white text-lg
            ${launching
              ? 'scale-95 animate-pulse'
              : 'hover:scale-105 active:scale-95'
            }`}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            boxShadow: launching
              ? '0 0 60px rgba(245,158,11,0.8)'
              : '0 0 30px rgba(245,158,11,0.5)',
          }}
        >
          {launching ? (
            <>
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </>
          ) : (
            <>
              <Zap className="w-10 h-10" />
              <span>GO!</span>
            </>
          )}
        </button>

        {/* Category preview */}
        <div className="w-full max-w-sm">
          <p className="text-slate-500 text-xs text-center mb-3">Could be any of these...</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {SCENARIO_CATEGORIES.map(cat => (
              <span key={cat.id} className="text-xs bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                {cat.emoji} {cat.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
