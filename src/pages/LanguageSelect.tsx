import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Mascot from '@/components/Mascot'
import { ChevronRight } from 'lucide-react'

export const LANGUAGES = [
  { code: 'Spanish', flag: '🇪🇸', name: 'Spanish', native: 'Español', voice: 'es', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'French', flag: '🇫🇷', name: 'French', native: 'Français', voice: 'fr', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'German', flag: '🇩🇪', name: 'German', native: 'Deutsch', voice: 'de', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Japanese', flag: '🇯🇵', name: 'Japanese', native: '日本語', voice: 'ja', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Mandarin', flag: '🇨🇳', name: 'Mandarin', native: '普通话', voice: 'zh', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Italian', flag: '🇮🇹', name: 'Italian', native: 'Italiano', voice: 'it', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Portuguese', flag: '🇧🇷', name: 'Portuguese', native: 'Português', voice: 'pt', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Arabic', flag: '🇸🇦', name: 'Arabic', native: 'العربية', voice: 'ar', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Korean', flag: '🇰🇷', name: 'Korean', native: '한국어', voice: 'ko', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
  { code: 'Hindi', flag: '🇮🇳', name: 'Hindi', native: 'हिन्दी', voice: 'hi', elevenlabs: 'pFZP5JQG7iQjIQuC4Bku' },
]

export default function LanguageSelect() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    if (!selected || !user) return
    setSaving(true)
    await supabase.from('profiles').update({ target_language: selected }).eq('id', user.id)
    await refreshProfile()
    navigate('/dashboard')
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Violet accent bar */}
      <div className="h-1.5 bg-violet-600 w-full" />

      <div className="flex-1 flex flex-col px-6 pt-8 pb-6">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Mascot className="w-28 h-auto mb-4" />
          <h1 className="text-3xl font-black text-slate-900 text-center">What do you want to learn?</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">You can change this later in settings</p>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-150 active:scale-95 ${
                selected === lang.code
                  ? 'border-violet-500 bg-violet-50 shadow-md'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <div className="text-left">
                <p className={`font-black text-sm ${selected === lang.code ? 'text-violet-700' : 'text-slate-800'}`}>
                  {lang.name}
                </p>
                <p className="text-xs text-slate-400">{lang.native}</p>
              </div>
              {selected === lang.code && (
                <div className="ml-auto w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full h-14 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-95 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed mt-6 shadow-lg"
        >
          {saving ? 'Saving...' : 'Let\'s go!'}
          {!saving && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
