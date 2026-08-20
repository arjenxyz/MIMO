type MascotMood = "wave" | "excited" | "happy";

export function Mascot({ mood = "wave", className = "" }: { mood?: MascotMood; className?: string }) {
  const eyeSpark = mood !== "happy";

  return (
    <div className={`mimo-bounce relative ${className}`}>
      <svg viewBox="0 0 220 240" className="h-52 w-52 drop-shadow-xl sm:h-64 sm:w-64" role="img" aria-label="Mimo maskotu">
        <ellipse cx="110" cy="228" rx="52" ry="10" fill="#0e171c" opacity="0.55" />
        <ellipse cx="110" cy="148" rx="78" ry="72" fill="#58cc02" />
        <ellipse cx="110" cy="168" rx="48" ry="42" fill="#d7ffb8" />
        <g className={mood === "wave" ? "mimo-wave" : undefined}>
          <ellipse cx="28" cy="132" rx="22" ry="16" fill="#46a302" transform="rotate(-25 28 132)" />
          <ellipse cx="18" cy="126" rx="8" ry="6" fill="#58cc02" transform="rotate(-25 18 126)" />
        </g>
        <ellipse cx="192" cy="138" rx="22" ry="16" fill="#46a302" transform="rotate(18 192 138)" />
        <circle cx="82" cy="118" r="28" fill="#ffffff" />
        <circle cx="138" cy="118" r="28" fill="#ffffff" />
        <circle cx="86" cy="122" r="14" fill="#131f24" />
        <circle cx="142" cy="122" r="14" fill="#131f24" />
        <circle cx="91" cy="117" r="4.5" fill="#ffffff" />
        <circle cx="147" cy="117" r="4.5" fill="#ffffff" />
        {eyeSpark && (
          <>
            <path d="M82 96 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffffff" opacity="0.9" />
            <path d="M138 94 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffffff" opacity="0.9" />
          </>
        )}
        <path d="M98 142 C110 158, 122 158, 134 142 C122 152, 110 152, 98 142" fill="#ff9600" />
        <path d="M70 58 C78 28, 98 38, 104 62" fill="#58cc02" />
        <path d="M150 58 C142 28, 122 38, 116 62" fill="#58cc02" />
        <ellipse cx="78" cy="200" rx="14" ry="8" fill="#ff9600" />
        <ellipse cx="142" cy="200" rx="14" ry="8" fill="#ff9600" />
      </svg>
    </div>
  );
}
