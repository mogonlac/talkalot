import { Scenario } from '@/lib/supabase'

export const SCENARIO_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍕', color: 'from-orange-500 to-red-500' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: 'from-blue-500 to-cyan-500' },
  { id: 'business', label: 'Business', emoji: '💼', color: 'from-purple-500 to-indigo-500' },
  { id: 'medical', label: 'Medical', emoji: '🏥', color: 'from-green-500 to-teal-500' },
  { id: 'shopping', label: 'Shopping', emoji: '🛒', color: 'from-pink-500 to-rose-500' },
  { id: 'smalltalk', label: 'Small Talk', emoji: '💬', color: 'from-yellow-500 to-amber-500' },
]

export const SEED_SCENARIOS: Omit<Scenario, 'created_at'>[] = [
  {
    id: '1',
    title: 'Ordering at a Busy Restaurant',
    category: 'food',
    difficulty: 'beginner',
    character_name: 'Marco',
    character_role: 'Italian Waiter',
    character_personality: 'Impatient, dry humour, speaks fast',
    character_mood: 'Rushed and slightly irritable',
    character_accent: 'Strong Italian accent',
    opening_line: "Ey! You ready to order or what? We very busy tonight!",
    context: 'You are at a busy Italian restaurant in London. Marco has been waiting on 10 tables all night and is running out of patience.'
  },
  {
    id: '2',
    title: 'Airport Check-in Trouble',
    category: 'travel',
    difficulty: 'intermediate',
    character_name: 'Sarah',
    character_role: 'Airline Check-in Agent',
    character_personality: 'Professional but slightly robotic, follows rules strictly',
    character_mood: 'Neutral, by-the-book',
    character_accent: 'Standard British',
    opening_line: "Good morning. Passport and booking reference please. Your flight closes in 40 minutes.",
    context: 'You are at Heathrow airport. Your bag is 3kg overweight and you need to negotiate with Sarah to avoid paying the excess baggage fee.'
  },
  {
    id: '3',
    title: 'Job Interview',
    category: 'business',
    difficulty: 'advanced',
    character_name: 'James',
    character_role: 'Senior HR Manager',
    character_personality: 'Sharp, analytical, asks tough follow-up questions',
    character_mood: 'Focused and evaluative',
    character_accent: 'American',
    opening_line: "Thanks for coming in. So, tell me — why should we hire you over the other 200 candidates?",
    context: 'You are in a job interview at a top tech company. James is known for putting candidates under pressure to see how they handle stress.'
  },
  {
    id: '4',
    title: 'Doctors Appointment',
    category: 'medical',
    difficulty: 'intermediate',
    character_name: 'Dr. Patel',
    character_role: 'GP Doctor',
    character_personality: 'Calm, empathetic, asks precise questions',
    character_mood: 'Attentive and caring',
    character_accent: 'Indian-British',
    opening_line: "Hello, come in and take a seat. What seems to be the trouble today?",
    context: 'You are at a GP surgery. You have been feeling unwell for a week and need to describe your symptoms clearly to get the right treatment.'
  },
  {
    id: '5',
    title: 'Returning a Faulty Item',
    category: 'shopping',
    difficulty: 'beginner',
    character_name: 'Tina',
    character_role: 'Retail Customer Service',
    character_personality: 'Passive-aggressive, follows store policy strictly',
    character_mood: 'Unenthusiastic',
    character_accent: 'Northern English',
    opening_line: "Right, so what seems to be the problem with it then?",
    context: 'You bought a pair of headphones 2 weeks ago and they stopped working. Tina is going to make this as difficult as possible — you need to stay calm and firm.'
  },
  {
    id: '6',
    title: 'Meeting Your Neighbours',
    category: 'smalltalk',
    difficulty: 'beginner',
    character_name: 'Dave',
    character_role: 'Friendly Neighbour',
    character_personality: 'Chatty, curious, loves to talk about himself',
    character_mood: 'Warm and enthusiastic',
    character_accent: 'Australian',
    opening_line: "G'day! Just moved in next door? Welcome to the building mate!",
    context: 'You just moved into a new flat. Dave from next door has come to introduce himself and is very eager to chat.'
  },
]
