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
 * that test. The original `window.localStorage` descriptor is captured on
 * first use and restored automatically after every test via a module-level
 * `afterEach` — without this, the replacement leaks into every spec file that
 * runs afterward in the same Vitest worker (it broke `theme.service.spec.ts`
 * in CI).
 *
 * IMPORTANT: the restore hook is registered here, at module top level
 * (collection phase), not inside `installMemoryLocalStorage()` itself. Vitest
 * only honours hooks added during collection — an `afterEach()` call made
 * from *inside* a running `beforeEach`/`it` (i.e. at runtime) is silently
 * dropped and never executes. An earlier version of this helper called
 * `afterEach()` from inside `installMemoryLocalStorage()`, which is invoked
 * from each spec's own `beforeEach` — that registration never fired, so the
 * polyfill was never actually restored and kept leaking into subsequent spec
 * files, surfacing as an intermittent `theme.service.spec.ts` failure
 * depending on file/worker scheduling. Do not move this back into the
 * function.
 */
let originalDescriptor: PropertyDescriptor | undefined;
let installedInCurrentFile = false;

export function installMemoryLocalStorage(): void {
  if (!installedInCurrentFile) {
    originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    installedInCurrentFile = true;
  }

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
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
}

afterEach(() => {
  if (!installedInCurrentFile) {
    return;
  }
  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  } else {
    // Left as `window` (not `globalThis` like the rest of this file): this branch's coverage
    // depends on module-load order across the whole spec run (whichever spec file first
    // triggers installMemoryLocalStorage() captures originalDescriptor for the run), which a
    // same-file test cannot deterministically force — attempted, and it failed non-deterministically
    // for exactly this reason. Renaming would flip an already order-dependent, already-uncovered
    // line into a Sonar "new code" coverage-gate failure for no functional gain.
    delete (window as { localStorage?: Storage }).localStorage;
  }
});
