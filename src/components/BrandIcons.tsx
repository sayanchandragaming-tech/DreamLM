import React from 'react';

export const DREAMLM_LOGO_URL = '/dreamlm-logo.png';

export const DREAMLM_ADMIN_LOGO_URL = '/dreamlm-logo.png';

export const OrbitalSigil: React.FC<{ className?: string; animated?: boolean }> = ({
  className = 'w-10 h-10',
  animated = false,
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full text-secondary ${animated ? 'animate-[spin_24s_linear_infinite]' : ''}`}
      >
        {/* Orbital rings */}
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="19"
          stroke="currentColor"
          strokeWidth="3.2"
          transform="rotate(-28 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="19"
          stroke="currentColor"
          strokeWidth="3.2"
          transform="rotate(28 50 50)"
        />
        {/* Nucleus */}
        <circle cx="50" cy="50" r="5.5" fill="currentColor" />
        <circle cx="50" cy="50" r="2.5" fill="#faf9ff" />
        {/* Valence nodes */}
        <circle cx="28" cy="35" r="3.5" fill="currentColor" />
        <circle cx="72" cy="65" r="3.5" fill="currentColor" />
        <circle cx="72" cy="35" r="3.2" fill="#737780" />
        <circle cx="28" cy="65" r="3.2" fill="#737780" />
      </svg>
    </div>
  );
};
