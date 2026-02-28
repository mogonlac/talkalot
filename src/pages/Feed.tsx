import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SEED_SCENARIOS, SCENARIO_CATEGORIES } from '@/data/scenarios'
import { useAuth } from '@/contexts/AuthContext'
import { Flame, Star, Zap, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'
import { getScenarioImages, preloadScenarioImages } from '@/lib/imageCache'

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
}

const CARD_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-teal-500 to-cyan-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-500',
  'from-amber-500 to-orange-500',
]

function getLevelProgress(xp: number) {
  const xpPerLevel = 500
  const level = Math.floor(xp / xpPerLevel) + 1
  const progress = ((xp % xpPerLevel) / xpPerLevel) * 100
  return { level, progress }
}

export default function Feed() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile, user, loading } = useAuth()
  const startIndex = parseInt(searchParams.get('start') || '0', 10)
  const [currentIndex, setCurrentIndex] = useState(isNaN(startIndex) ? 0 : startIndex)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [bgImages, setBgImages] = useState<Record<number, string>>({})
  const [avatarImages, setAvatarImages] = useState<Record<number, string>>({})
  const [imgLoading, setImgLoading] = useState<Record<number, boolean>>({})
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  const loadImagesForIndex = useCallback(async (index: number) => {
    if ((bgImages[index] && avatarImages[index]) || imgLoading[index]) return
    const s = SEED_SCENARIOS[index]
    const cached = getScenarioImages(s.id)
    if (cached?.bg && cached?.avatar) {
      if (cached.bg) setBgImages(prev => ({ ...prev, [index]: cached.bg! }))
      if (cached.avatar) setAvatarImages(prev => ({ ...prev, [index]: cached.avatar! }))
      return
    }
    setImgLoading(prev => ({ ...prev, [index]: true }))
    await preloadScenarioImages(s.id)
    const images = getScenarioImages(s.id)
    if (images?.bg) setBgImages(prev => ({ ...prev, [index]: images.bg! }))
    if (images?.avatar) setAvatarImages(prev => ({ ...prev, [index]: images.avatar! }))
    setImgLoading(prev => ({ ...prev, [index]: false }))
  }, [bgImages, avatarImages, imgLoading])

  useEffect(() => {
    loadImagesForIndex(currentIndex)
    if (currentIndex + 1 < SEED_SCENARIOS.length) loadImagesForIndex(currentIndex + 1)
  }, [currentIndex])

  const goToNext = () => {
    if (isAnimating || currentIndex >= SEED_SCENARIOS.length - 1) return
    setDirection('up')
    setIsAnimating(true)
    setTimeout(() => { setCurrentIndex(prev => prev + 1); setIsAnimating(false); setDirection(null) }, 250)
  }

  const goToPrev = () => {
    if (isAnimating || currentIndex <= 0) return
    setDirection('down')
    setIsAnimating(true)
    setTimeout(() => { setCurrentIndex(prev => prev - 1); setIsAnimating(false); setDirection(null) }, 250)
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(diff) > 50) { if (diff > 0) goToNext(); else goToPrev() }
  }
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 30) goToNext()
    else if (e.deltaY < -30) goToPrev()
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const scenario = SEED_SCENARIOS[currentIndex]
  const category = SCENARIO_CATEGORIES.find(c => c.id === scenario.category)
  const gradient = CARD_COLORS[currentIndex % CARD_COLORS.length]
  const diff = DIFFICULTY_COLORS[scenario.difficulty]
  const { level, progress } = getLevelProgress(profile.xp)

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-hidden flex flex-col select-none relative"
      style={{ background: '#0a0a0f' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Background image */}
      {bgImages[currentIndex] ? (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-700"
          style={{ backgroundImage: `url(${bgImages[currentIndex]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }}
        />
      ) : (
        <div className={`absolute inset-0 z-0 bg-gradient-to-br ${gradient} opacity-20`} />
      )}

      {/* Gradient overlay - stronger at bottom */}
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.97) 100%)' }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Explorer</h1>
            <p className="text-xs text-white/50">Swipe to browse</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-300 font-black text-sm">{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-violet-500/20 px-3 py-1.5 rounded-full border border-violet-500/30">
            <Star className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300 font-black text-sm">Lv.{level}</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="relative z-20 mx-5 h-1 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-violet-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Main content - bottom anchored */}
      <div
        className={`relative z-20 flex-1 flex flex-col justify-end px-5 pb-6 transition-all duration-250 ${
          isAnimating
            ? direction === 'up' ? '-translate-y-6 opacity-0' : 'translate-y-6 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Character card */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white/30 shadow-xl`}>
            {avatarImages[currentIndex] ? (
              <img src={avatarImages[currentIndex]} alt={scenario.character_name} className="w-full h-full object-cover" />
            ) : imgLoading[currentIndex] ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="text-3xl">{category?.emoji}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-white">{scenario.character_name}</h2>
            <p className="text-white/60 text-sm">{scenario.character_role}</p>
            <p className="text-white/40 text-xs italic mt-0.5">"{scenario.character_mood}"</p>
          </div>
        </div>

        {/* Scenario title + badges */}
        <div className="mb-3">
          <h3 className="text-xl font-black text-white mb-2">{scenario.title}</h3>
          <div className="flex gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${diff.bg} ${diff.text} ${diff.border}`}>
              {scenario.difficulty}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border border-white/20 bg-white/10 text-white/70 font-medium backdrop-blur-sm">
              {category?.emoji} {category?.label}
            </span>
          </div>
        </div>

        {/* Mission box */}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm mb-4">
          <p className="text-white/70 text-xs leading-relaxed">{scenario.context}</p>
        </div>

        {/* Start button */}
        <button
          onClick={() => navigate(`/scenario/${scenario.id}`)}
          className={`w-full h-14 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-95 bg-gradient-to-r ${gradient} shadow-lg`}
        >
          <Zap className="w-5 h-5" />
          Start Conversation
        </button>
      </div>

      {/* Right side nav dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
        <button onClick={goToPrev} disabled={currentIndex === 0} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${currentIndex === 0 ? 'opacity-20' : 'bg-white/10 hover:bg-white/20 border border-white/20'}`}>
          <ChevronUp className="w-4 h-4 text-white" />
        </button>
        <div className="flex flex-col gap-1.5">
          {SEED_SCENARIOS.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'w-2 h-5 bg-white' : 'w-2 h-2 bg-white/30'}`} />
          ))}
        </div>
        <p className="text-white/40 text-xs font-medium mt-1">{currentIndex + 1}/{SEED_SCENARIOS.length}</p>
        <button onClick={goToNext} disabled={currentIndex === SEED_SCENARIOS.length - 1} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${currentIndex === SEED_SCENARIOS.length - 1 ? 'opacity-20' : 'bg-white/10 hover:bg-white/20 border border-white/20'}`}>
          <ChevronDown className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}
