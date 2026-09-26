import React from 'react';

export const DREAMLM_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VQXLxTElZpySCS9G9Ro8SGWfTCSc3tvKH7au-LAp76qj5MbQIuJ6JnAVyWI4woGDZ6xmWitEqksgx75hyaldQlcAlBhMTVUOY2pzG4GvqH-ou3A4IGSkK7LroEVqbs8ae8-8JNWEyCaQ-J9C4sBnxqzPIUnoZV9dhkmEgTgns1174Iun5d89qzKuGNFB3uQ2LY7zdg7PN1hkTRwJFNwMsyY9lCkFEfmnyfGAa2HRXRwKaBIdTkMnFTtg';

export const DREAMLM_ADMIN_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1WW7ziiaeig0YShmviTpcye3acLQYzwMFdHQ_EycVgEHLYvwcirN-lMQbKJq0CJ6PHTqtlDeqZSKzi3ofBWecLeWWfzIC7YpQ2_QN4IotVuvQ_60ygM78XdbxqOaAO0Cu0TFVa3k60w2n1IFfgRNtjqm7XLbZebdS5s3KiTG-IlwYSljquMC75yW7yZWWINNO4TLDEc5zS16XL5djrwxZktWZnBK2XVDVJE9dVftc6ujzT2vx2yH3zz';

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
