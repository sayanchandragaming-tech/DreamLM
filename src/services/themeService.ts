/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'scientific-elegance' | 'deep-enclave' | 'ivory-monograph';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  isDefault?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'scientific-elegance',
    name: 'Scientific Elegance',
    description: 'Milky archival white, restrained cobalt accents, deep obsidian typography',
    isDefault: true,
  },
  {
    id: 'deep-enclave',
    name: 'Deep Enclave',
    description: 'Dark vellum substrate, midnight cobalt, cool crisp telemetry',
  },
  {
    id: 'ivory-monograph',
    name: 'Ivory Monograph',
    description: 'Warm tactile ivory vellum, sepia-tinted notation, deep carbon',
  },
];

const STORAGE_KEY_1 = 'dreamlm-theme';
const STORAGE_KEY_2 = 'dreamlm_theme';

export function getStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_1) || localStorage.getItem(STORAGE_KEY_2);
    if (raw === 'deep-enclave' || raw === 'ivory-monograph' || raw === 'scientific-elegance') {
      return raw;
    }
    return 'scientific-elegance';
  } catch {
    return 'scientific-elegance';
  }
}

// Global subscribers for real-time reactivity without page reloads
type ThemeListener = (theme: ThemeId) => void;
const listeners = new Set<ThemeListener>();

export function subscribeToTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyThemeToDOM(theme: ThemeId): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Set data-theme attribute on both root and body
  root.setAttribute('data-theme', theme);
  if (body) {
    body.setAttribute('data-theme', theme);
  }

  // Manage class names for multi-selector CSS support
  const themeClasses = ['theme-scientific-elegance', 'theme-deep-enclave', 'theme-ivory-monograph'];
  themeClasses.forEach((cls) => {
    root.classList.remove(cls);
    if (body) body.classList.remove(cls);
  });

  const activeClass = `theme-${theme}`;
  root.classList.add(activeClass);
  if (body) body.classList.add(activeClass);
}

export function setStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY_1, theme);
    localStorage.setItem(STORAGE_KEY_2, theme);
  } catch {
    // Ignore storage quota errors
  }

  applyThemeToDOM(theme);

  // Notify all components subscribed to the global theme
  listeners.forEach((listener) => {
    try {
      listener(theme);
    } catch {
      // Ignore listener errors
    }
  });
}

// Reactive hook for components
export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(() => getStoredTheme());

  useEffect(() => {
    // Ensure DOM is in sync with current state
    applyThemeToDOM(currentTheme);

    const unsubscribe = subscribeToTheme((newTheme) => {
      setCurrentThemeState(newTheme);
    });
    return unsubscribe;
  }, []);

  const changeTheme = useCallback((newTheme: ThemeId) => {
    setStoredTheme(newTheme);
  }, []);

  return [currentTheme, changeTheme];
}

// Immediately apply theme on initial module evaluation (avoids any flicker)
if (typeof window !== 'undefined') {
  try {
    const initialTheme = getStoredTheme();
    applyThemeToDOM(initialTheme);
  } catch {
    // Graceful fallback
  }
}
