import { afterEach } from 'vitest';

/**
 * Test-only in-memory `Storage` polyfill for specs exercising `window.localStorage`
 * (US02.2.4's {@link AccountDeletionStateService} and its consumers).
 *
 * In this repo's Vitest/BrowserTestingModule unit-test environment,
 * `window.localStorage` resolves to Node's own lazy `internal/webstorage`
 * accessor rather than a working `Storage` — reading it emits an
 * `ExperimentalWarning` and yields `undefined` ("localStorage is not available
 * because --localstorage-file was not provided"). This is a pre-existing
 * environment gap (also hit by `ThemeService`/`NavbarComponent` specs), not
 * something introduced here.
 *
 * Call {@link installMemoryLocalStorage} as the very first line of a spec's
 * `beforeEach` — before any code (including the component/service under test)
 * touches `localStorage` — to install a fresh, real, working `Storage` for
 * that test. The original `window.localStorage` descriptor is captured and
 * restored automatically via a self-registered `afterEach` — without this,
 * the replacement leaks into every spec file that runs afterward in the same
 * Vitest worker (it broke `theme.service.spec.ts` in CI before this fix).
 */
export function installMemoryLocalStorage(): void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  const backing = new Map<string, string>();
  const storage: Storage = {
    getItem: (key: string) => (backing.has(key) ? (backing.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      backing.set(key, String(value));
    },
    removeItem: (key: string) => {
      backing.delete(key);
    },
    clear: () => {
      backing.clear();
    },
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    get length() {
      return backing.size;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor);
    } else {
      delete (window as { localStorage?: Storage }).localStorage;
    }
  });
}
