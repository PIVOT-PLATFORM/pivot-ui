/**
 * Test-only `localStorage` polyfill.
 *
 * `npm run test:ci` (`ng test`, the `@angular/build:unit-test` vitest runner) does not expose
 * a global `localStorage` at all — a pre-existing environment gap on `main`, already hit by
 * `theme.service.spec.ts`, `navbar.component.spec.ts`, `auth-shell.component.spec.ts` and
 * `login.component.spec.ts` (their `beforeEach`/`afterEach` hooks crash on `localStorage.clear()`
 * with "Cannot read properties of undefined"). `src/test-setup.ts` does NOT fix this: it is
 * wired to `vitest.stryker.config.ts` (mutation testing) only, not to the `ng test` builder,
 * which builds its own Vite/jsdom environment internally.
 *
 * US02.1.2 ("Préférence de langue") is built entirely on the same `localStorage`-backed
 * language-persistence mechanism the codebase already uses (`NavbarComponent.setLang`,
 * `AuthShellComponent.setLang`) — see `LanguagePreferenceService`. Its tests, and the tests of
 * anything that now depends on it, would be unable to exercise that code at all without this.
 *
 * Call once at the top of a spec file, before any `describe`/`TestBed` usage. Idempotent and
 * a no-op in any environment that already has a real `localStorage` (e.g. a real browser, or
 * `vitest.stryker.config.ts`'s jsdom-with-globals setup).
 */
export function ensureLocalStorageStub(): void {
  if (typeof globalThis.localStorage !== 'undefined') return;

  const store = new Map<string, string>();
  const stub: Storage = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, 'localStorage', { value: stub, writable: true, configurable: true });
}
