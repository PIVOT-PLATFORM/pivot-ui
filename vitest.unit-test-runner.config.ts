import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * "External" Vitest config loaded by the `@angular/build:unit-test` builder — wired via
 * `angular.json` → `projects.frontend.architect.test.options.runnerConfig`. Not used by any
 * other script (`test:mutation`/Stryker has its own `vitest.stryker.config.ts` + `src/test-setup.ts`
 * — see that file's doc comment).
 *
 * EN53.4 — `agilite-ui`/`collaboratif-ui`/`design-system` became internal workspace projects
 * (`projects/*`, resolved by `tsconfig.json` `paths` to `src/public-api.ts`) instead of published
 * npm packages. That broke `whiteboard-module-loader.spec.ts` / `app.routes.spec.ts`'s
 * `vi.doMock('@pivot-platform/collaboratif-ui', ...)`:
 *
 * The unit-test builder pre-bundles the whole test graph with esbuild *before* Vitest starts.
 * For the loader's *dynamic* `import('@pivot-platform/collaboratif-ui')`
 * (`src/app/core/modules/whiteboard-module-loader.ts`), esbuild resolves the workspace-project
 * specifier and code-splits it into its own pre-built chunk at that build step — the emitted
 * call site becomes `import("./chunk-XXXX.js")`, a relative path to that chunk, not the original
 * specifier string — before Vitest's own module graph (and `vi.mock`/`vi.doMock`, which register
 * mocks against the *literal* specifier written at the call site) ever gets a chance to intercept
 * it. `chunk-XXXX.js` always resolves to the real library, so the mock silently never applies.
 *
 * Fix (two parts, both required):
 * 1. `angular.json` → `architect.build.configurations.test.externalDependencies` marks
 *    `@pivot-platform/collaboratif-ui` external for that dedicated test build configuration only
 *    (`architect.test.options.buildTarget: "frontend:build:test"` — never touches the real
 *    `development`/`production`/`ci` build configs). esbuild then leaves the specifier untouched
 *    in the emitted code, deferring resolution to Vitest/Vite's own runtime resolver — which DOES
 *    check `vi.mock`/`vi.doMock` registrations first, keyed on that same literal specifier.
 * 2. The `resolve.alias` below is what lets that runtime resolver find the *real* module in the
 *    (far more common) non-mocked case — e.g. `app.config.ts`'s static top-level import of
 *    `provideCollaboratifUi`/`COLLABORATIF_BEARER_TOKEN`/`COLLABORATIF_CURRENT_USER` — since Vite
 *    has no built-in awareness of `tsconfig.json` `paths` (an Angular/TypeScript-only resolution
 *    mechanism); without this alias every *unmocked* import of the now-external specifier would
 *    fail to resolve at test runtime.
 *
 * The loader's contract (lazy `import()` + `ModuleLoadErrorComponent` fallback on reject) is
 * untouched by this file — this only changes how the *test* build resolves the specifier.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@pivot-platform/collaboratif-ui': fileURLToPath(
        new URL('./projects/collaboratif-ui/src/public-api.ts', import.meta.url),
      ),
    },
  },
});
