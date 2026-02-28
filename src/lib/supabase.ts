import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Profile {
  id: string
  username: string
  xp: number
  level: number
  elo: number
  streak: number
  cefr_level: string
  created_at?: string
}

export interface Scenario {
  id: string
  title: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  character_name: string
  character_role: string
  character_personality: string
  character_mood: string
  character_accent: string
  opening_line: string
  context: string
  created_at?: string
}

export interface ScenarioAttempt {
  id: string
  user_id: string
  scenario_id: string
  score: number
  transcript: string
  feedback: string
  created_at?: string
}
