/**
 * ThemeService — manages the active UI theme for the PIVOT application.
 *
 * Supported themes:
 *  - 'light' → default, no data-theme attribute (CSS :root tokens apply)
 *  - 'dark'  → sets data-theme="dark" on <html>
 *
 * Persistence: localStorage key 'pivot_theme'.
 * Initial resolution: stored preference → prefers-color-scheme media query → 'light'.
 */
import { Injectable, signal, effect } from '@angular/core';

/** Available UI themes. */
export type Theme = 'light' | 'dark';

const VALID_THEMES: Theme[] = ['light', 'dark'];
const STORAGE_KEY = 'pivot_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.resolveInitialTheme());

  /** Current active theme (readonly signal). */
  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const t = this._theme();
      if (t === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', t);
      }
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  toggleTheme(): void {
    this._theme.set(this._theme() === 'light' ? 'dark' : 'light');
  }

  private resolveInitialTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && (VALID_THEMES as string[]).includes(stored)) {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
