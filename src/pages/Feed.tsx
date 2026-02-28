import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SEED_SCENARIOS, SCENARIO_CATEGORIES } from '@/data/scenarios'
import { useAuth } from '@/contexts/AuthContext'
import { Flame, Star, MessageSquare, LogOut, Zap, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'
import { getScenarioImages, preloadScenarioImages } from '@/lib/imageCache'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-300 border-green-500/40',
  intermediate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  advanced: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const CHARACTER_GRADIENTS = [
  'from-purple-600 to-indigo-600',
  'from-orange-500 to-red-500',
  'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-blue-500 to-cyan-500',
  'from-yellow-500 to-amber-500',
]

const CHARACTER_EMOJIS: Record<string, string> = {
  food: '🍕',
  travel: '✈️',
  business: '💼',
  medical: '🏥',
  shopping: '🛒',
  smalltalk: '💬',
}

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
  const [bgImages, setBgImages] = useState<Record<number, string>>({})
  const [avatarImages, setAvatarImages] = useState<Record<number, string>>({})
  const [imgLoading, setImgLoading] = useState<Record<number, boolean>>({})
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadImagesForIndex = useCallback(async (index: number) => {
    if (bgImages[index] || imgLoading[index]) return
    const s = SEED_SCENARIOS[index]
    // Check cache first
    const cached = getScenarioImages(s.id)
    if (cached) {
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
  }, [bgImages, imgLoading])

  useEffect(() => {
    // Load images for current and next card
    loadImagesForIndex(currentIndex)
    if (currentIndex + 1 < SEED_SCENARIOS.length) loadImagesForIndex(currentIndex + 1)
  }, [currentIndex])

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  const goToNext = () => {
    if (isAnimating || currentIndex >= SEED_SCENARIOS.length - 1) return
    setDirection('up')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setIsAnimating(false)
      setDirection(null)
    }, 300)
  }

  const goToPrev = () => {
    if (isAnimating || currentIndex <= 0) return
    setDirection('down')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex(prev => prev - 1)
      setIsAnimating(false)
      setDirection(null)
    }, 300)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext()
      else goToPrev()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 30) goToNext()
    else if (e.deltaY < -30) goToPrev()
  }

  const handleStartScenario = () => {
    navigate(`/scenario/${SEED_SCENARIOS[currentIndex].id}`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-purple-400 text-lg font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  const scenario = SEED_SCENARIOS[currentIndex]
  const category = SCENARIO_CATEGORIES.find(c => c.id === scenario.category)
  const gradient = CHARACTER_GRADIENTS[currentIndex % CHARACTER_GRADIENTS.length]
  const emoji = CHARACTER_EMOJIS[scenario.category] || '💬'
  const { level, progress } = getLevelProgress(profile.xp)

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-hidden relative select-none"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 mr-1"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-base">DuoConnect</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-400 font-bold text-xs">{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/30">
            <Star className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-400 font-bold text-xs">Lv.{level}</span>
          </div>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* XP bar */}
      <div className="absolute top-16 left-5 right-5 z-20">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Background image */}
      {bgImages[currentIndex] && (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${bgImages[currentIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35
          }}
        />
      )}
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Main card */}
      <div
        className={`absolute inset-0 flex flex-col items-end justify-end px-6 pb-32 z-10 transition-all duration-300 ${
          isAnimating
            ? direction === 'up'
              ? '-translate-y-full opacity-0'
              : 'translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Character avatar + info row */}
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarImages[currentIndex] ? (
                <img
                  src={avatarImages[currentIndex]}
                  alt={scenario.character_name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50"
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl`}
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                >
                  {imgLoading[currentIndex] ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : emoji}
                </div>
              )}
            </div>

            {/* Character info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white leading-tight">{scenario.character_name}</h2>
              <p className="text-slate-300 text-sm font-medium">{scenario.character_role}</p>
              <p className="text-slate-500 text-xs italic mt-0.5">"{scenario.character_mood}"</p>
            </div>
          </div>

          {/* Scenario title + badges */}
          <div>
            <h3 className="text-white font-black text-xl mb-2">{scenario.title}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${DIFFICULTY_COLORS[scenario.difficulty]}`}>
                {scenario.difficulty}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border border-slate-600 text-slate-400 font-medium">
                {category?.emoji} {category?.label}
              </span>
            </div>
          </div>

          {/* Opening line preview */}
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Opening line</p>
            <p className="text-slate-200 text-sm italic leading-relaxed">"{scenario.opening_line}"</p>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartScenario}
            className="w-full h-14 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, #7c3aed, #4f46e5)`,
              boxShadow: '0 0 30px rgba(124,58,237,0.5), 0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <Zap className="w-5 h-5" />
            Start Conversation
          </button>
        </div>
      </div>

      {/* Scroll indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${currentIndex === 0 ? 'opacity-20' : 'bg-white/10 hover:bg-white/20'}`}
        >
          <ChevronUp className="w-4 h-4 text-white" />
        </button>

        {/* Dot indicators */}
        <div className="flex flex-col gap-1.5">
          {SEED_SCENARIOS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-2 h-6 bg-purple-400' : 'w-2 h-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === SEED_SCENARIOS.length - 1}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${currentIndex === SEED_SCENARIOS.length - 1 ? 'opacity-20' : 'bg-white/10 hover:bg-white/20'}`}
        >
          <ChevronDown className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Swipe hint at bottom */}
      <div className="absolute bottom-6 left-0 right-0 z-20 text-center">
        <p className="text-slate-600 text-xs">Swipe up for next scenario</p>
      </div>
    </div>
  )
}
