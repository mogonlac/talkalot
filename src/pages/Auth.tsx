import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Zap, Trophy } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'}}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center" style={{boxShadow: '0 0 20px rgba(124,58,237,0.6)'}}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">DuoConnect</h1>
          <p className="text-purple-300 mt-2 text-sm font-medium">Master English through AI conversations</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span>Rapid-fire scenarios</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Trophy className="w-3 h-3 text-purple-400" />
              <span>AI scoring</span>
            </div>
          </div>
        </div>

        <Card className="border-purple-900/50 bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Get Started</CardTitle>
            <CardDescription className="text-slate-400">Join thousands improving their English</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="w-full bg-slate-800 mb-6">
                <TabsTrigger value="login" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white">Login</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Password</Label>
                    <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500" />
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Username</Label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="cooluser123" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Password</Label>
                    <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500" />
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11">
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
