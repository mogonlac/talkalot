import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Mascot from '@/components/Mascot'
import { MessageSquare } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    else navigate('/dashboard')
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!username.trim()) { setError('Username is required'); setLoading(false); return }
    const { error } = await signUp(email, password, username)
    if (error) setError(error.message)
    else navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="h-1.5 bg-violet-600 w-full absolute top-0 left-0" />
      <div className="w-full max-w-sm">
        {/* Logo + Mascot */}
        <div className="flex flex-col items-center mb-8">
          <Mascot className="w-32 h-auto mb-4 animate-bounce" style={{animationDuration: '2s'}} />
          <h1 className="text-3xl font-black text-slate-900">Talkalot</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">Master English through AI conversations</p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all duration-200 ${
              tab === 'login' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'
            }`}
          >Login</button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all duration-200 ${
              tab === 'signup' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'
            }`}
          >Sign Up</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleSignIn} className="space-y-4 rounded-3xl border border-slate-100 shadow-sm p-6 bg-white">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold text-sm">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:shadow-sm transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold text-sm">Password</Label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:shadow-sm transition-all" />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-base transition-all duration-200 active:scale-95 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4 rounded-3xl border border-slate-100 shadow-sm p-6 bg-white">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold text-sm">Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="cooluser123" required className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:shadow-sm transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold text-sm">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:shadow-sm transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold text-sm">Password</Label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-12 focus:shadow-sm transition-all" />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-base transition-all duration-200 active:scale-95 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="flex gap-3 mt-8">
          <div className="flex-1 bg-violet-50 rounded-2xl p-3 text-center shadow-sm">
            <p className="text-violet-600 font-black text-lg">12+</p>
            <p className="text-violet-400 text-xs">Scenarios</p>
          </div>
          <div className="flex-1 bg-teal-50 rounded-2xl p-3 text-center shadow-sm">
            <p className="text-teal-600 font-black text-lg">AI</p>
            <p className="text-teal-400 text-xs">Voice chat</p>
          </div>
          <div className="flex-1 bg-orange-50 rounded-2xl p-3 text-center shadow-sm">
            <p className="text-orange-600 font-black text-lg">XP</p>
            <p className="text-orange-400 text-xs">Gamified</p>
          </div>
        </div>
      </div>
    </div>
  )
}
