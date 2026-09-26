/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DREAMLM_ADMIN_LOGO_URL } from './BrandIcons.tsx';
import { verifyAdminCredentials } from '../services/adminAuth.ts';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsVerifying(true);

    const result = await verifyAdminCredentials(username, password);
    setIsVerifying(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMessage(result.error || 'Invalid administrator credentials.');
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-space-md sm:p-space-xl bg-surface select-none relative">
      {/* Background Math Formula Watermarks */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex flex-col justify-between select-none opacity-25">
        <div className="flex justify-between w-full p-8 text-primary font-code-notation text-display-lg select-none">
          <span>∇²Ψ + \frac&#123;8\pi^2 m&#125;&#123;h^2&#125;(E - V)\Psi = 0</span>
        </div>
        <div className="flex justify-around w-full text-primary font-code-notation text-headline-lg select-none">
          <span>\mathcal&#123;H&#125;|\psi\rangle = i\hbar \frac&#123;\partial&#125;&#123;\partial t&#125;|\psi\rangle</span>
        </div>
      </div>

      {/* Main Enclave Card Container */}
      <div className="relative z-10 w-full max-w-lg bg-surface-container-lowest shadow-xl rounded-xl overflow-hidden flex flex-col border border-outline-variant/30">
        {/* Top Header with Back Navigation */}
        <div className="bg-surface-container-low px-space-lg py-space-sm flex items-center justify-between border-b border-outline-variant/20">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Workspace</span>
          </button>
          <span className="font-code-notation text-[11px] text-outline tracking-wider font-semibold">
            ENCLAVE GATEWAY
          </span>
        </div>

        <div className="p-space-lg sm:p-space-xl flex flex-col">
          {/* Header & Insignia */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-space-md">
              <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center p-2.5 shadow-xs border border-outline-variant/30">
                <img
                  alt="DreamLM Admin Emblem"
                  className="w-full h-full object-contain"
                  src={DREAMLM_ADMIN_LOGO_URL}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-container-lowest shadow-xs flex items-center justify-center border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-xs">lock</span>
              </div>
            </div>

            <h1 className="font-headline-md text-headline-md text-primary tracking-tight font-semibold">
              DreamLM Admin Login
            </h1>
            <p className="font-body-md text-body-sm text-on-surface-variant mt-1 max-w-sm">
              Dream Circuit Private Beta Control Center
            </p>
          </div>

          {/* Credential Helper Box */}
          <div className="mt-4 p-3 rounded-lg bg-secondary-fixed/50 border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="material-symbols-outlined text-sm text-secondary">vpn_key</span>
              <span>
                Authorized credentials: <strong className="font-code-notation">admin</strong> / <strong className="font-code-notation">admin</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-semibold text-secondary hover:text-primary underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Autofill</span>
              <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-lg bg-error-container/30 border border-error/20 flex items-center gap-2 text-xs text-error font-medium animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-space-md flex flex-col space-y-space-md">
            {/* Admin Username */}
            <div className="flex flex-col space-y-1">
              <label
                className="font-label-md text-label-md text-on-surface font-semibold"
                htmlFor="admin-username"
              >
                Admin Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-on-surface-variant pointer-events-none flex items-center">
                  <span className="material-symbols-outlined text-base">badge</span>
                </div>
                <input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/60 rounded-lg transition-colors border border-outline-variant/30 focus:outline-none focus:bg-surface-container-low focus:ring-1 focus:ring-primary font-code-notation"
                  placeholder="Enter administrator username (e.g. admin)"
                  autoFocus
                  required
                  type="text"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div className="flex flex-col space-y-1">
              <label
                className="font-label-md text-label-md text-on-surface font-semibold"
                htmlFor="admin-password"
              >
                Admin Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-on-surface-variant pointer-events-none flex items-center">
                  <span className="material-symbols-outlined text-base">vpn_key</span>
                </div>
                <input
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/60 rounded-lg transition-colors border border-outline-variant/30 focus:outline-none focus:bg-surface-container-low focus:ring-1 focus:ring-primary font-code-notation"
                  placeholder="Enter administrator password (e.g. admin)"
                  required
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-outline hover:text-on-surface transition-colors flex items-center"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-base">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-space-xs">
              <button
                disabled={isVerifying}
                className="w-full py-3 px-space-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center space-x-2 transition-all duration-150 shadow-xs active:scale-[0.99] font-semibold"
                type="submit"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">shield_lock</span>
                    <span>Sign in to Admin Panel</span>
                    <span className="font-code-notation opacity-60 ml-1 text-label-sm">→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Notice */}
          <div className="mt-space-lg p-space-md bg-surface-container-low rounded-lg flex gap-3 items-start border border-outline-variant/20">
            <span className="material-symbols-outlined text-secondary text-base mt-0.5 flex-shrink-0">
              info
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed text-xs">
              Authorized Dream Circuit administrators only. Access attempts are recorded for system audit and security verification.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-container px-space-lg py-2.5 flex items-center justify-between text-[11px] font-code-notation text-outline border-t border-outline-variant/20">
          <span>Private Beta Security Enclave</span>
          <span>Zero-Trust Protocol</span>
        </div>
      </div>
    </div>
  );
};
