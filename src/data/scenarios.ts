import { Scenario } from '@/lib/supabase'

// ElevenLabs voice IDs mapped by character
export const CHARACTER_VOICES: Record<string, string> = {
  'Marco': 'cjVigY5qzO86Huf0OWal',       // Eric - smooth, male American (Italian waiter)
  'Sarah': 'EXAVITQu4vr4xnSDxMaL',       // Sarah - mature female American (check-in agent)
  'James': 'iP95p4xoKVk53GoZ742B',        // Chris - charming male American (HR manager)
  'Dr. Patel': 'nPczCjzI2devNBz1zQrb',   // Brian - deep male (doctor)
  'Tina': 'FGY2WhTYpPnrIDTdsKH5',        // Laura - quirky female (retail)
  'Dave': 'IKne3meq5aSn9XLyUdCD',        // Charlie - deep male Australian (neighbour)
  'Claire': 'Xb7hH8MSUJpSbSDYk0k2',     // Alice - clear female British (manager)
  'Roberto': 'JBFqnCBsd6RMkjVDRZzb',    // George - warm male British (hotel)
  'Kevin': 'TX3LPaxmHKxFdv7VOQHJ',      // Liam - energetic male American (tech support)
  'Alex': 'SAz9YHcvj6GT2YYXdXww',       // River - neutral (date)
  'Sandra': 'cgSgspJ2msm6clMCkdW9',     // Jessica - playful female (estate agent)
  'Nurse Williams': 'pFZP5JQG7iQjIQuC4Bku', // Lily - female British (nurse)
}

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
    context: '🎯 MISSION: Order a meal for yourself and a friend with a nut allergy. You must ask about allergens, order two different mains, and get the bill split separately — all before Marco loses his patience.'
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
    context: '🎯 MISSION: Your bag is 3kg overweight and you have no cash for the £60 excess fee. Convince Sarah to waive the fee or find another solution — without losing your cool. Your flight boards in 40 minutes.'
  },
  {
    id: '3',
    title: 'High-Stakes Job Interview',
    category: 'business',
    difficulty: 'advanced',
    character_name: 'James',
    character_role: 'Senior HR Manager',
    character_personality: 'Sharp, analytical, asks tough follow-up questions',
    character_mood: 'Focused and evaluative',
    character_accent: 'American',
    opening_line: "Thanks for coming in. So, tell me — why should we hire you over the other 200 candidates?",
    context: '🎯 MISSION: Land the job. Answer James\'s tough questions confidently, give a specific example of a past achievement, and ask at least one smart question about the role — all without rambling or going blank.'
  },
  {
    id: '4',
    title: 'Emergency Doctors Appointment',
    category: 'medical',
    difficulty: 'intermediate',
    character_name: 'Dr. Patel',
    character_role: 'GP Doctor',
    character_personality: 'Calm, empathetic, asks precise questions',
    character_mood: 'Attentive and caring',
    character_accent: 'Indian-British',
    opening_line: "Hello, come in and take a seat. What seems to be the trouble today?",
    context: '🎯 MISSION: You\'ve had a persistent headache, blurry vision and fatigue for 5 days. Clearly describe all your symptoms, answer Dr. Patel\'s questions accurately, and successfully request a referral to a specialist.'
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
    context: '🎯 MISSION: Your headphones broke after 2 weeks. Get a full refund — not a store credit, not an exchange — a refund. Tina will push back at every step. Stay polite, firm, and know your consumer rights.'
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
    context: '🎯 MISSION: Make a good first impression. Introduce yourself naturally, find out the building\'s bin collection day and wifi password (without being awkward), and politely end the conversation when Dave won\'t stop talking.'
  },
  {
    id: '7',
    title: 'Negotiating a Pay Rise',
    category: 'business',
    difficulty: 'advanced',
    character_name: 'Claire',
    character_role: 'Line Manager',
    character_personality: 'Reasonable but budget-conscious, needs convincing',
    character_mood: 'Cautious but open',
    character_accent: 'Standard British',
    opening_line: "So you wanted to talk about your compensation package? What's on your mind?",
    context: '🎯 MISSION: Ask for a 15% pay rise. Back it up with specific achievements from the last 6 months, handle Claire\'s objections about budget, and leave the meeting with at least a firm commitment to review your salary.'
  },
  {
    id: '8',
    title: 'Complaining About a Hotel Room',
    category: 'travel',
    difficulty: 'intermediate',
    character_name: 'Roberto',
    character_role: 'Hotel Receptionist',
    character_personality: 'Apologetic but limited in what he can offer',
    character_mood: 'Sympathetic but defensive',
    character_accent: 'Spanish accent',
    opening_line: "Good evening, welcome back. Is everything okay with your room?",
    context: '🎯 MISSION: Your room has no hot water, the air con is broken, and it overlooks a noisy building site. Get upgraded to a better room at no extra cost — or failing that, a meaningful discount on your bill.'
  },
  {
    id: '9',
    title: 'Calling Tech Support',
    category: 'smalltalk',
    difficulty: 'intermediate',
    character_name: 'Kevin',
    character_role: 'Tech Support Agent',
    character_personality: 'Over-explains, uses too much jargon, follows a script',
    character_mood: 'Helpful but robotic',
    character_accent: 'American Midwest',
    opening_line: "Thank you for calling TechHelp, my name is Kevin, how can I assist you today?",
    context: '🎯 MISSION: Your internet has been down for 3 days. Get Kevin to escalate your case to a senior engineer and schedule a home visit — without being put on hold indefinitely or fobbed off with basic troubleshooting steps again.'
  },
  {
    id: '10',
    title: 'First Date Conversation',
    category: 'smalltalk',
    difficulty: 'beginner',
    character_name: 'Alex',
    character_role: 'Your Date',
    character_personality: 'Witty, slightly nervous, asks lots of questions',
    character_mood: 'Excited but testing the waters',
    character_accent: 'Southern American',
    opening_line: "Okay so I have to say — your profile said you were interesting. Prove it.",
    context: '🎯 MISSION: Impress Alex on a first date. Share something genuinely interesting about yourself, ask thoughtful questions, handle the awkward silence at the 3-minute mark, and get Alex to agree to a second date.'
  },
  {
    id: '11',
    title: 'Renting a Flat Viewing',
    category: 'business',
    difficulty: 'intermediate',
    character_name: 'Sandra',
    character_role: 'Estate Agent',
    character_personality: 'Enthusiastic salesperson, spins everything positively',
    character_mood: 'High energy, persuasive',
    character_accent: 'London',
    opening_line: "Welcome! This is a fantastic property — it won't be on the market long. Shall we start the tour?",
    context: '🎯 MISSION: The flat has damp on the walls, no dishwasher and is £200 over your budget. Find out about all the hidden problems by asking the right questions, then negotiate the rent down before Sandra pressures you to sign today.'
  },
  {
    id: '12',
    title: 'Late Night A&E Visit',
    category: 'medical',
    difficulty: 'advanced',
    character_name: 'Nurse Williams',
    character_role: 'A&E Triage Nurse',
    character_personality: 'Efficient, no-nonsense, seen it all before',
    character_mood: 'Professional but stretched thin',
    character_accent: 'Welsh',
    opening_line: "Right, what's brought you in tonight? Give me the short version first.",
    context: '🎯 MISSION: You have severe chest pain that started 2 hours ago. Clearly communicate your symptoms, your medical history and current medications, convince Nurse Williams this is urgent enough to be seen immediately rather than waiting 4 hours.'
  },
]
