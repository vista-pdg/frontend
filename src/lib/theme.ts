import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
const KEY = 'vista_theme';
let preference: ThemePreference = 'system';
let media: MediaQueryList | null = null;
let initialized = false;
const isPreference = (value: string | null): value is ThemePreference => value === 'light' || value === 'dark' || value === 'system';

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

function refresh() {
  applyTheme(preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference);
  window.dispatchEvent(new Event('vista-theme-change'));
}

export function initializeTheme() {
  try {
    const stored = localStorage.getItem(KEY);
    preference = isPreference(stored) ? stored : 'system';
  } catch { /* use the system preference in private mode */ }
  media ??= window.matchMedia('(prefers-color-scheme: dark)');
  if (!initialized) {
    media.addEventListener('change', () => { if (preference === 'system') refresh(); });
    window.addEventListener('storage', event => {
      if (event.key === KEY || event.key === null) {
        preference = isPreference(event.newValue) ? event.newValue : 'system';
        refresh();
      }
    });
    initialized = true;
  }
  refresh();
}

export function setTheme(theme: ThemePreference) {
  preference = theme;
  refresh();
  try { localStorage.setItem(KEY, theme); } catch { /* keep the in-memory preference */ }
}

function subscribe(listener: () => void) {
  window.addEventListener('vista-theme-change', listener);
  return () => window.removeEventListener('vista-theme-change', listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe,
    () => document.documentElement.classList.contains('dark') ? 'dark' : 'light', () => 'dark');
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference, () => 'system');
}
