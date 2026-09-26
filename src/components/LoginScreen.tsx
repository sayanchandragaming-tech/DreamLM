/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DREAMLM_LOGO_URL, OrbitalSigil } from './BrandIcons.tsx';
import { isUserBanned, recordOrUpdateUser } from '../services/userService.ts';

interface LoginScreenProps {
  onLogin: (username: string) => void;
  onAdminLoginClick: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onAdminLoginClick,
}) => {
  const [username, setUsername] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanUser = username.trim() || 'researcher';

    // Check if user is banned
    if (isUserBanned(cleanUser)) {
      setErrorMessage(`Access Denied: Account "${cleanUser}" has been suspended from the DreamLM Private Beta by an administrator.`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const recordResult = recordOrUpdateUser(cleanUser, 'Researcher');
      if (!recordResult.allowed) {
        setIsLoading(false);
        setErrorMessage(recordResult.error || `Account "${cleanUser}" is suspended.`);
        return;
      }
      onLogin(cleanUser);
      setIsLoading(false);
    }, 400);
  };

  const handleGoogleSignInClick = () => {
    setErrorMessage(null);
    const testGoogleUser = username.trim() || 'google.researcher';
    if (isUserBanned(testGoogleUser)) {
      setErrorMessage(`Access Denied: Account "${testGoogleUser}" has been suspended from the DreamLM Private Beta by an administrator.`);
      return;
    }
    recordOrUpdateUser(testGoogleUser, 'Researcher');
    onLogin(testGoogleUser);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-space-md bg-surface select-none relative">
      {/* Subtle Mathematical Watermark Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30">
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

      <div className="w-full max-w-[500px] relative z-10 flex flex-col gap-space-lg">
        {/* Top System Status Banner */}
        <div className="flex items-center justify-between px-space-xs text-on-surface-variant font-code-notation text-label-sm">
          <span className="flex items-center gap-1.5 tracking-wider font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Dream Circuit
          </span>
          <span className="font-semibold tracking-widest text-secondary">PRIVATE BETA ACCESS</span>
        </div>

        {/* Central Login Card */}
        <div className="bg-surface-container-lowest shadow-xl rounded-xl p-space-xl flex flex-col items-center border border-outline-variant/30">
          {/* Brand Emblem */}
          <div className="relative w-20 h-20 mb-space-md flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-surface-container-low animate-pulse"></div>
            {!logoError ? (
              <img
                alt="Dream Circuit Emblem"
                className="w-16 h-16 object-contain relative z-10 drop-shadow-xs"
                src={DREAMLM_LOGO_URL}
                onError={() => setLogoError(true)}
              />
            ) : (
              <OrbitalSigil className="w-16 h-16 relative z-10" />
            )}
          </div>

          <div className="flex items-center gap-2 mb-space-xs">
            <span className="bg-surface-container text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-lg tracking-wider font-bold border border-outline-variant/20">
              RESEARCH WORKSPACE
            </span>
            <span className="font-code-notation text-label-sm text-on-surface-variant font-medium">
              v0.9.4
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-primary text-center tracking-tight mt-1 font-semibold">
            DreamLM
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant text-center mt-1 mb-space-lg">
            Theoretical Scientific AI Assistant
          </p>

          {/* Error / Banned Message */}
          {errorMessage && (
            <div className="w-full mb-4 p-3 rounded-lg bg-error-container/30 border border-error/30 flex items-start gap-2.5 text-xs text-error font-medium animate-in fade-in duration-150">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">block</span>
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Temporary Sign-In Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-md text-label-md text-primary font-semibold flex justify-between"
                htmlFor="username-input"
              >
                <span>Username or Email</span>
                <span className="text-on-surface-variant font-code-notation text-label-sm font-normal text-[11px]">
                  Testing Identity
                </span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-lg select-none">
                  account_circle
                </span>
                <input
                  id="username-input"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-surface text-on-surface font-body-md text-body-md rounded-lg shadow-2xs border border-outline-variant/30 placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Enter your username or email"
                  autoFocus
                  required
                  type="text"
                />
              </div>
            </div>

            <button
              className="w-full mt-1 py-3 px-4 rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 font-semibold shadow-xs"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  <span>Entering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Continue to Workspace</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign-in Placeholder (structured for future implementation) */}
          <div className="w-full flex items-center my-space-md gap-3">
            <div className="h-px bg-surface-container-high flex-1"></div>
            <span className="font-code-notation text-label-sm text-outline font-medium tracking-wider text-[11px]">
              AUTHENTICATION INTEGRATION
            </span>
            <div className="h-px bg-surface-container-high flex-1"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignInClick}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-all border border-outline-variant/30 text-xs font-medium"
            title="Google Sign-In will be connected via Supabase/OAuth in production"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              ></path>
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              ></path>
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              ></path>
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              ></path>
            </svg>
            <span>Continue with Google (Temporary Test Sign-in)</span>
          </button>

          {/* Private Beta Notice */}
          <div className="w-full mt-space-lg p-space-md rounded-xl bg-surface-container-low flex items-start gap-3 text-left border border-outline-variant/20">
            <span className="material-symbols-outlined text-secondary text-lg shrink-0 mt-0.5">
              shield
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-headline-sm text-label-md text-primary tracking-wide font-semibold">
                PRIVATE BETA NOTICE
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                DreamLM is in private beta testing. Access is restricted. Conversations may be reviewed by Dream Circuit for beta testing, debugging, safety, and model improvement.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-space-xs text-xs">
          <button
            onClick={onAdminLoginClick}
            className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors flex items-center gap-1 font-semibold"
            type="button"
          >
            <span className="material-symbols-outlined text-xs">lock</span>
            <span>Admin Panel Login</span>
          </button>
          <span className="font-code-notation text-outline text-[11px]">
            Dream Circuit © 2026
          </span>
        </div>
      </div>
    </div>
  );
};
