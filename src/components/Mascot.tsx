export default function Mascot({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hair */}
      <ellipse cx="100" cy="58" rx="42" ry="18" fill="#7C3AED" />
      <rect x="58" y="48" width="84" height="20" fill="#7C3AED" rx="4" />

      {/* Head */}
      <circle cx="100" cy="90" r="48" fill="#FBBF24" />

      {/* Eyes — large pill-shaped */}
      <rect x="72" y="78" width="20" height="26" rx="10" fill="#111111" />
      <rect x="108" y="78" width="20" height="26" rx="10" fill="#111111" />

      {/* Mouth — simple curved line */}
      <path d="M86 108 Q100 120 114 108" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Rosy cheeks */}
      <ellipse cx="72" cy="108" rx="10" ry="6" fill="#F87171" opacity="0.5" />
      <ellipse cx="128" cy="108" rx="10" ry="6" fill="#F87171" opacity="0.5" />

      {/* Neck */}
      <rect x="88" y="134" width="24" height="16" fill="#FBBF24" rx="4" />

      {/* Torso */}
      <rect x="62" y="148" width="76" height="72" rx="24" fill="#14B8A6" />

      {/* Left arm — slightly raised, bouncy */}
      <rect x="22" y="148" width="44" height="28" rx="14" fill="#14B8A6" transform="rotate(-20 44 162)" />
      {/* Left mitten hand */}
      <ellipse cx="30" cy="178" rx="18" ry="14" fill="#FBBF24" />

      {/* Right arm — raised up */}
      <rect x="134" y="140" width="44" height="28" rx="14" fill="#14B8A6" transform="rotate(25 156 154)" />
      {/* Right mitten hand */}
      <ellipse cx="172" cy="164" rx="18" ry="14" fill="#FBBF24" />

      {/* Left leg */}
      <rect x="72" y="214" width="28" height="48" rx="14" fill="#7C3AED" />
      {/* Left foot */}
      <ellipse cx="86" cy="264" rx="20" ry="10" fill="#111111" />

      {/* Right leg */}
      <rect x="100" y="218" width="28" height="44" rx="14" fill="#7C3AED" />
      {/* Right foot */}
      <ellipse cx="114" cy="264" rx="20" ry="10" fill="#111111" />
    </svg>
  )
}
