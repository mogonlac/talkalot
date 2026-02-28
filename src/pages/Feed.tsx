import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SEED_SCENARIOS, SCENARIO_CATEGORIES } from '@/data/scenarios'
import { useAuth } from '@/contexts/AuthContext'
import { Flame, Star, LogOut, Zap, ChevronUp, ChevronDown, ArrowLeft, Map } from 'lucide-react'
import { getScenarioImages, preloadScenarioImages } from '@/lib/imageCache'

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
}

const CARD_COLORS = [
  { bg: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-200' },
  { bg: 'bg-teal-500', light: 'bg-teal-50', border: 'border-teal-200' },
  { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200' },
  { bg: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-200' },
  { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200' },
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
  const { profile, signOut, user, loading } = useAuth()
  const startIndex = parseInt(searchParams.get('start') || '0', 10)
  const [currentIndex, setCurrentIndex] = useState(isNaN(startIndex) ? 0 : startIndex)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [avatarImages, setAvatarImages] = useState<Record<number, string>>({})
  const [imgLoading, setImgLoading] = useState<Record<number, boolean>>({})
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  const loadImagesForIndex = useCallback(async (index: number) => {
    if (avatarImages[index] || imgLoading[index]) return
    const s = SEED_SCENARIOS[index]
    const cached = getScenarioImages(s.id)
    if (cached?.avatar) {
      setAvatarImages(prev => ({ ...prev, [index]: cached.avatar! }))
      return
    }
    setImgLoading(prev => ({ ...prev, [index]: true }))
    await preloadScenarioImages(s.id)
    const images = getScenarioImages(s.id)
    if (images?.avatar) setAvatarImages(prev => ({ ...prev, [index]: images.avatar! }))
    setImgLoading(prev => ({ ...prev, [index]: false }))
  }, [avatarImages, imgLoading])

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
  const cardColor = CARD_COLORS[currentIndex % CARD_COLORS.length]
  const diff = DIFFICULTY_COLORS[scenario.difficulty]
  const { level, progress } = getLevelProgress(profile.xp)

  return (
    <div
      ref={containerRef}
      className="h-screen w-full bg-white overflow-hidden flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900">Explorer</h1>
            <p className="text-xs text-slate-400">Swipe to browse</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-orange-600 font-black text-sm">{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-violet-100 px-3 py-1.5 rounded-full">
            <Star className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-violet-600 font-black text-sm">Lv.{level}</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mx-5 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Main card */}
      <div
        className={`flex-1 flex flex-col justify-end px-5 pb-6 transition-all duration-250 ${
          isAnimating
            ? direction === 'up' ? '-translate-y-8 opacity-0' : 'translate-y-8 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Big character card */}
        <div className={`${cardColor.light} ${cardColor.border} border-2 rounded-2xl p-5 mb-4 flex items-center gap-4`}>
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl ${cardColor.bg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
            {avatarImages[currentIndex] ? (
              <img src={avatarImages[currentIndex]} alt={scenario.character_name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-3xl">{category?.emoji}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900">{scenario.character_name}</h2>
            <p className="text-slate-500 text-sm">{scenario.character_role}</p>
            <p className="text-slate-400 text-xs italic mt-1">"{scenario.character_mood}"</p>
          </div>
        </div>

        {/* Scenario info */}
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-900 mb-2">{scenario.title}</h3>
          <div className="flex gap-2 mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${diff.bg} ${diff.text} ${diff.border}`}>
              {scenario.difficulty}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 font-medium">
              {category?.emoji} {category?.label}
            </span>
          </div>
          {/* Mission */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <p className="text-slate-600 text-xs leading-relaxed">{scenario.context}</p>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => navigate(`/scenario/${scenario.id}`)}
          className="w-full h-14 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-95 bg-violet-600 hover:bg-violet-700"
        >
          <Zap className="w-5 h-5" />
          Start Conversation
        </button>
      </div>

      {/* Right side nav dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <button onClick={goToPrev} disabled={currentIndex === 0} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${currentIndex === 0 ? 'opacity-20' : 'bg-slate-100 hover:bg-slate-200'}`}>
          <ChevronUp className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex flex-col gap-1.5">
          {SEED_SCENARIOS.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'w-2 h-5 bg-violet-500' : 'w-2 h-2 bg-slate-200'}`} />
          ))}
        </div>
        <button onClick={goToNext} disabled={currentIndex === SEED_SCENARIOS.length - 1} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${currentIndex === SEED_SCENARIOS.length - 1 ? 'opacity-20' : 'bg-slate-100 hover:bg-slate-200'}`}>
          <ChevronDown className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Swipe hint */}
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <p className="text-slate-300 text-xs">Swipe up for next</p>
      </div>
    </div>
  )
}
