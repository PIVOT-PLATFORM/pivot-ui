/**
 * Global setup for `ng test collaboratif-ui` (`@angular/build:unit-test`, Vitest runner) — wired
 * via `angular.json`'s `projects.collaboratif-ui.architect.test.options.setupFiles`.
 *
 * Same pre-existing environment gap already documented and fixed for the shell (see
 * `src/test-setup-vitest.ts` and `src/app/core/i18n/testing/local-storage-stub.ts`): the
 * `@angular/build:unit-test` Vitest runner does not expose a global `localStorage` at all.
 * `BoardStore`'s clipboard mirror (`core/whiteboard/board.store.ts`, `CLIPBOARD_STORAGE_KEY`)
 * reads/writes `localStorage` directly, and its specs (`board.store.spec.ts`,
 * `board-page.component.spec.ts` — the `copySelected`/`cutSelected`/`pasteFromClipboard`/Ctrl+X
 * suites) call `localStorage.clear()` in `beforeEach`/inline — without this stub they crash with
 * "Cannot read properties of undefined (reading 'clear')".
 *
 * Deliberately duplicated rather than imported from the shell (`pivot-ui`'s `src/app/...`): this
 * is a library project (`projects/collaboratif-ui`) and must not depend on shell application code
 * (same independence rule as design-system's EN17.8 `no-restricted-imports`).
 */
function ensureLocalStorageStub(): void {
  if (globalThis.localStorage !== undefined) return;

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

ensureLocalStorageStub();
