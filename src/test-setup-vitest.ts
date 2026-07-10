import { ensureLocalStorageStub } from './app/core/i18n/testing/local-storage-stub';

/**
 * Global setup for the `ng test` (`@angular/build:unit-test`, Vitest runner) suite — wired via
 * `angular.json`'s `test.options.setupFiles`. Runs once, before any spec file is loaded.
 *
 * Guarantees `globalThis.localStorage` exists before *any* spec file's own imports are
 * evaluated. This matters beyond the per-file `ensureLocalStorageStub()` calls already used by
 * several specs (`theme.service.spec.ts`, `navbar.component.spec.ts`, etc.): those calls run as
 * part of the *spec file's own* module body, which only executes after all of that file's
 * imports have already been evaluated — too late when a spec (e.g. `login.component.spec.ts`,
 * importing `GOOGLE_CLIENT_ID` from `app.config.ts`) transitively imports something that reads
 * `localStorage` eagerly at module-evaluation time (`detectInitialLang()` in `app.config.ts`).
 * A global `setupFiles` entry runs strictly before every spec file is even loaded, closing that
 * gap regardless of import order.
 *
 * Not `src/test-setup.ts`: that file is wired to `vitest.stryker.config.ts` (mutation testing)
 * only, not to this builder — see its own doc comment.
 */
ensureLocalStorageStub();
