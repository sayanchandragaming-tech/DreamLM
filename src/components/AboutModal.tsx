/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DREAMLM_LOGO_URL, OrbitalSigil } from './BrandIcons.tsx';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest max-w-lg w-full rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-surface-container-low px-space-lg py-space-sm flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">info</span>
            <span className="font-headline-sm text-xs font-semibold text-primary uppercase tracking-wider">
              About DreamLM
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface text-base"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-space-lg space-y-space-md">
          {/* Logo & Headline */}
          <div className="flex items-center gap-3 pb-space-sm border-b border-outline-variant/20">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant/30">
              <OrbitalSigil className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
                DreamLM
              </h2>
              <div className="text-xs text-on-surface-variant font-code-notation">
                Developed by Dream Circuit • Private Beta v0.9.4
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-body-sm text-xs text-on-surface-variant leading-relaxed">
            <p>
              <strong className="text-primary font-semibold">DreamLM</strong> is an AI assistant developed by <strong className="text-primary font-semibold">Dream Circuit</strong>, engineered for theoretical reasoning, computational physics, and mathematical synthesis.
            </p>
          </div>

          {/* Founders Section */}
          <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2">
            <div className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-bold">
              Creators &amp; Founders
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-body-sm text-xs">
              <div className="flex items-center gap-2 p-2 bg-surface-container-lowest rounded border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-base">person</span>
                <span className="font-semibold text-primary">Arindam Roy</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-surface-container-lowest rounded border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-base">person</span>
                <span className="font-semibold text-primary">Sayan Chandra</span>
              </div>
            </div>
          </div>

          {/* Private Beta Note */}
          <div className="text-[11px] text-outline leading-relaxed border-t border-outline-variant/20 pt-3">
            <span>
              DreamLM is currently operating under private beta evaluation. Conversations may be reviewed by Dream Circuit for beta testing, debugging, safety, and model improvement.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-surface-container px-space-lg py-2.5 flex justify-end border-t border-outline-variant/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded hover:bg-primary-container transition-colors"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
