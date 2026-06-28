/**
 * ThemeService — manages the active UI theme for the PIVOT application.
 *
 * Supported themes:
 *  - 'light'  → default, no data-theme attribute (CSS :root tokens apply)
 *  - 'dark'   → sets data-theme="dark" on <html>
 *  - 'ocean'  → sets data-theme="ocean" on <html>
 *
 * Persistence: localStorage key 'pivot_theme'.
 * Initial resolution: stored preference → prefers-color-scheme media query → 'light'.
 *
 * The effect runs synchronously on construction, so the theme is applied
 * before the first render frame (no flash of wrong theme).
 */
import { Injectable, signal, effect } from '@angular/core';

/** Available UI themes. */
export type Theme = 'light' | 'dark' | 'ocean';

const VALID_THEMES: Theme[] = ['light', 'dark', 'ocean'];
const STORAGE_KEY = 'pivot_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.resolveInitialTheme());

  /** Current active theme (readonly signal). */
  readonly theme = this._theme.asReadonly();

  constructor() {
    // effect() runs immediately and re-runs whenever _theme changes
    effect(() => {
      const t = this._theme();
      // 'light' → remove attribute so only :root tokens apply
      if (t === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', t);
      }
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  /**
   * Sets the active theme.
   * Triggers the effect that updates <html data-theme> and persists to localStorage.
   */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  /** Toggles between light and dark (ignores ocean). */
  toggleTheme(): void {
    this._theme.set(this._theme() === 'light' ? 'dark' : 'light');
  }

  /**
   * Cycles through themes in order: light → dark → ocean → light.
   * Useful for a single toggle button.
   */
  cycleTheme(): void {
    const current = this._theme();
    const idx = VALID_THEMES.indexOf(current);
    const next = VALID_THEMES[(idx + 1) % VALID_THEMES.length];
    this._theme.set(next);
  }

  private resolveInitialTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && (VALID_THEMES as string[]).includes(stored)) {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
