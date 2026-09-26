/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DREAMLM_LOGO_URL, OrbitalSigil } from './BrandIcons.tsx';

interface BannedScreenProps {
  username: string;
  reason?: string;
  onSignOut: () => void;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({
  username,
  reason,
  onSignOut,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-space-md sm:p-space-xl bg-surface select-none relative">
      {/* Subtle Mathematical Watermark Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-25">
        <svg
          className="w-[1000px] h-[1000px] text-surface-variant/40"
          fill="none"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="500" cy="500" r="460" stroke="currentColor" strokeDasharray="6 6" strokeWidth="1"></circle>
          <circle cx="500" cy="500" r="340" stroke="currentColor" strokeWidth="1"></circle>
          <circle cx="500" cy="500" r="220" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1"></circle>
          <line stroke="currentColor" strokeDasharray="2 4" strokeWidth="1" x1="500" x2="500" y1="20" y2="980"></line>
          <line stroke="currentColor" strokeDasharray="2 4" strokeWidth="1" x1="20" x2="980" y1="500" y2="500"></line>
        </svg>
      </div>

      <div className="w-full max-w-lg relative z-10 bg-surface-container-lowest shadow-2xl rounded-2xl border border-error/30 overflow-hidden flex flex-col">
        {/* Top Warning Strip */}
        <div className="bg-error/10 px-space-lg py-3 flex items-center justify-between border-b border-error/20 text-error">
          <div className="flex items-center gap-2 font-code-notation text-xs font-semibold">
            <span className="material-symbols-outlined text-base">block</span>
            <span>ENCLAVE ACCESS DENIED</span>
          </div>
          <span className="font-code-notation text-[11px] uppercase tracking-wider font-bold">
            Status: Banned
          </span>
        </div>

        <div className="p-space-lg sm:p-space-xl flex flex-col items-center text-center">
          {/* Emblem with Banned Badge */}
          <div className="relative w-20 h-20 mb-space-md flex items-center justify-center">
            <div className="w-18 h-18 rounded-full bg-error-container/20 flex items-center justify-center border border-error/30 shadow-xs">
              <OrbitalSigil className="w-12 h-12 opacity-60 text-error" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-sm">close</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-error-container/30 text-error text-[11px] font-semibold border border-error/30 mb-2">
            <span>Private Beta Access Revoked</span>
          </div>

          <h1 className="font-headline-lg text-headline-md text-primary font-semibold tracking-tight">
            Account Suspended
          </h1>
          <p className="font-body-md text-body-sm text-on-surface-variant mt-1 max-w-sm leading-relaxed">
            Your access to the DreamLM Private Beta workspace has been revoked by a Dream Circuit administrator.
          </p>

          {/* Details Card */}
          <div className="w-full mt-5 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
              <span className="text-outline font-medium">User Account:</span>
              <span className="font-semibold text-primary font-code-notation">{username}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
              <span className="text-outline font-medium">Current Status:</span>
              <span className="font-bold text-error uppercase font-code-notation">Banned</span>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <span className="text-outline font-medium">Reason for Suspension:</span>
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-error/20 text-on-surface font-body-sm italic">
                "{reason || 'Administrative policy enforcement / Private beta access suspended.'}"
              </div>
            </div>
          </div>

          {/* Contact / Action Area */}
          <div className="w-full mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSignOut}
              className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center justify-center gap-2"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Sign Out &amp; Return to Login</span>
            </button>
          </div>

          <p className="text-[11px] text-outline mt-4">
            If you believe this suspension is in error, please contact Dream Circuit administrators (Sayan Chandra or Arindam Roy).
          </p>
        </div>

        {/* Footer */}
        <div className="bg-surface-container px-space-lg py-2.5 flex items-center justify-between text-[11px] font-code-notation text-outline border-t border-outline-variant/20">
          <span>Dream Circuit Enclave</span>
          <span>Zero-Trust Security</span>
        </div>
      </div>
    </div>
  );
};
