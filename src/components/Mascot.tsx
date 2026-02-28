export default function Mascot({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shadow */}
      <ellipse cx="80" cy="196" rx="36" ry="6" fill="#E2E8F0" />

      {/* Body */}
      <rect x="44" y="108" width="72" height="68" rx="28" fill="#7C3AED" />

      {/* Left arm */}
      <rect x="14" y="112" width="34" height="22" rx="11" fill="#7C3AED" transform="rotate(-15 31 123)" />
      {/* Left hand */}
      <circle cx="18" cy="136" r="12" fill="#FCD34D" />

      {/* Right arm */}
      <rect x="112" y="112" width="34" height="22" rx="11" fill="#7C3AED" transform="rotate(15 129 123)" />
      {/* Right hand */}
      <circle cx="142" cy="136" r="12" fill="#FCD34D" />

      {/* Left leg */}
      <rect x="54" y="166" width="24" height="36" rx="12" fill="#5B21B6" />
      {/* Left foot */}
      <ellipse cx="66" cy="200" rx="16" ry="8" fill="#1E293B" />

      {/* Right leg */}
      <rect x="82" y="166" width="24" height="36" rx="12" fill="#5B21B6" />
      {/* Right foot */}
      <ellipse cx="94" cy="200" rx="16" ry="8" fill="#1E293B" />

      {/* Neck */}
      <rect x="68" y="100" width="24" height="16" rx="8" fill="#FCD34D" />

      {/* Head */}
      <circle cx="80" cy="76" r="44" fill="#FCD34D" />

      {/* Hair */}
      <path d="M36 64 Q40 28 80 24 Q120 28 124 64" fill="#7C3AED" />
      <ellipse cx="80" cy="24" rx="26" ry="10" fill="#7C3AED" />

      {/* Left eye */}
      <rect x="56" y="64" width="16" height="22" rx="8" fill="#1E293B" />
      {/* Left eye shine */}
      <circle cx="60" cy="68" r="3" fill="white" />

      {/* Right eye */}
      <rect x="88" y="64" width="16" height="22" rx="8" fill="#1E293B" />
      {/* Right eye shine */}
      <circle cx="92" cy="68" r="3" fill="white" />

      {/* Smile */}
      <path d="M64 94 Q80 106 96 94" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Cheeks */}
      <ellipse cx="56" cy="90" rx="9" ry="5" fill="#F87171" opacity="0.5" />
      <ellipse cx="104" cy="90" rx="9" ry="5" fill="#F87171" opacity="0.5" />
    </svg>
  )
}
