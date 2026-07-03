# [0.7.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.6.0...v0.7.0) (2026-07-03)


### Features

* **auth:** US01.1.4 — Redirection post-login ([#64](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/64)) ([6093214](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/6093214e11a24d5655f51f17fdcd9eea1c261217)), closes [#125](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/125)

# [0.6.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.5.0...v0.6.0) (2026-07-03)


### Features

* **auth:** US01.1.5 — Expiration de session (front) + auto-logout ([#63](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/63)) ([ef0374a](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/ef0374a92a06f522af69f086f04f50f8481d8830))

# [0.5.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.4.0...v0.5.0) (2026-07-01)


### Features

* **ui:** ContactComponent — contact cards, form validation, public route ([#48](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/48)) ([db8648d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/db8648d2b95b91594c16552cb5fe8ec41c039a33)), closes [#7C3AED](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/7C3AED) [#4338ca](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/4338ca)

# [0.4.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.3.0...v0.4.0) (2026-07-01)


### Features

* **ui:** HomeComponent — module grid, coming-soon cards, module registry ([#47](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/47)) ([762a4ac](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/762a4ac7b71aee3f6ed8baa9cb513d462591615e))

# [0.3.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.2.0...v0.3.0) (2026-06-28)


### Features

* **ui:** redesign shell and navbar — top-nav layout, theme toggle, user menu ([#49](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/49)) ([f63d423](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/f63d423cbd53d2bc385c2d4884123590e1caf3e8)), closes [#4338ca](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/4338ca) [#7c3aed](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/7c3aed) [#09090b](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/09090b)

# [0.2.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.1.0...v0.2.0) (2026-06-28)


### Features

* **ui:** ThemeService — light/dark/ocean themes with CSS token overrides ([#46](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/46)) ([1e1171b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/1e1171be1755c9ed31d5187c8b3cfdcf2f3c38c2))

# [0.1.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.0.0...v0.1.0) (2026-06-28)


### Bug Fixes

* remove duplicate root CODEOWNERS — .github/CODEOWNERS takes effect ([d757e81](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d757e81b0a9ac19a6375d8e53b8b89a0c5162228))
* **ui:** i18n pipe on error signal + tokenState guard in reset-password submit ([80920d1](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/80920d1100619f8a14063b03a78793ce5cc6a127))
* **ui:** remove dead error signal, add tokenState guard test ([b6e5980](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/b6e5980f4de3fd61e60f9627db480c6ea4f08af9))


### Features

* **a11y:** add aria-busy on submit buttons; test double-submit on error ([7bcecca](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7bceccada851fac53bc710b1e15be739ff294036))
* **a11y:** aria-describedby on password field, role=alert on error span ([0e2ac31](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/0e2ac31642f843af77543598c7fc00e1efe49ea6)), closes [input#newPassword](https://github.com/input/issues/newPassword)
* **a11y:** replace aria-busy with role=status live region; add DOM test ([cdb06c8](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/cdb06c8f0170e446d30be99fe7a5fb79efb70164))
* **ci:** add DAST workflows (baseline + full scan avec pivot-core GHCR) ([e62eb09](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/e62eb09258c085c209097a86adc3f01e0d7d3013))
* **docker:** add docker-compose.yml (cohérence avec pivot-core) ([d3d3a02](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d3d3a0230ada012b9b4842b69f3e704dd4783b37))
* migrate Angular source code from pivot-core/frontend/ ([91ec06c](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/91ec06cc63c8e066231eeaa53f275917b859f922))
* **modules:** PivotModuleDto, PivotModuleUi, ModuleRegistryService ([#45](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/45)) ([27d108e](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/27d108e1266298979f10d01c7624b72795ca52ba))
* **ui:** auth pages MVP — E01 ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/39)) ([8b73c94](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/8b73c94f787f434ce421668901d4960ac1b91151)), closes [#19](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/19) [CA#6](https://github.com/CA/issues/6) [CA#6](https://github.com/CA/issues/6) [CA#7](https://github.com/CA/issues/7)

# Changelog

All notable changes to PIVOT UI are documented in this file.

**Versioning :** [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — automated via [Semantic Release](https://github.com/semantic-release/semantic-release) on push to `main`.

---

## [0.0.0] - 2026-06-28

### Features

* **auth:** login, register, verify-email, resend-verification, forgot-password, reset-password, device-confirm pages
* **auth:** OIDC PKCE S256 client via `angular-oauth2-oidc`
* **auth:** opaque token session — in-memory only, never localStorage
* **auth:** anti-enumeration — resend-verification always shows success screen regardless of server response
* **auth:** token validation guard on reset-password — blocks submit if token expired/invalid
* **i18n:** Transloco (fr/en) on all auth pages
* **a11y:** WCAG 2.1 AA — `role="status"` live regions on loading states, `aria-describedby` + `role="alert"` on errors, `.sr-only`, focus management, keyboard navigation
* **ui:** Angular 22, TypeScript strict, `ChangeDetectionStrategy.OnPush`, Signals, RxJS
* **ui:** SCSS design system — tokens CSS, BEM, responsive, dark-mode ready
* **infra:** Docker nginx production image
* **ci:** GitHub Actions — build, lint (ESLint), TypeScript strict, tests (Vitest + coverage), SonarCloud
* **ci:** DAST (ZAP baseline monthly + full scan manual), SCA (Trivy + npm audit + Dependabot), SBOM CycloneDX, secret scanning (Gitleaks), SAST (CodeQL + Semgrep), SLSA L3, OpenSSF Scorecard, Lighthouse accessibility, Playwright E2E, Plumber compliance
