import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { SEED_SCENARIOS, SCENARIO_CATEGORIES } from '@/data/scenarios'

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-900/50 text-green-300 border-green-700/50',
  intermediate: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  advanced: 'bg-red-900/50 text-red-300 border-red-700/50',
}

export default function Explorer() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredScenarios = selectedCategory
    ? SEED_SCENARIOS.filter(s => s.category === selectedCategory)
    : SEED_SCENARIOS

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-900/30">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-lg">Explorer Mode</span>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        {/* Category Filter */}
        <div className="mb-6">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Filter by Category</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                selectedCategory === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {SCENARIO_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario List */}
        <div className="space-y-3">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            {filteredScenarios.length} Scenarios
          </h2>
          {filteredScenarios.map(scenario => {
            const category = SCENARIO_CATEGORIES.find(c => c.id === scenario.category)
            return (
              <Card
                key={scenario.id}
                onClick={() => navigate(`/scenario/${scenario.id}`)}
                className="cursor-pointer border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200 group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category?.color || 'from-purple-500 to-indigo-500'} flex items-center justify-center flex-shrink-0 text-xl`}>
                      {category?.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-sm truncate">{scenario.title}</h3>
                      </div>
                      <p className="text-slate-500 text-xs truncate mb-2">
                        With <span className="text-slate-300 font-medium">{scenario.character_name}</span> · {scenario.character_role}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[scenario.difficulty]}`}>
                          {scenario.difficulty}
                        </span>
                        <span className="text-xs text-slate-500 truncate italic">"{scenario.opening_line.slice(0, 40)}..."</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
