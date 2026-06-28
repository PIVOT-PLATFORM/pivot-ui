# Changelog

All notable changes to PIVOT UI are documented in this file.

**Versioning :** [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — automated via [Semantic Release](https://github.com/semantic-release/semantic-release) on push to `main`.

---

## [0.2.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/0.0.0...0.2.0) (2026-06-28)

### Features

* **a11y:** replace `aria-busy` on submit buttons with `role="status"` live region — screen readers now announce loading state (WCAG 4.1.3) ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))
* **a11y:** add `aria-describedby` + `role="alert"` on password error span in reset-password (WCAG 1.3.1 / 3.3.1) ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))
* **a11y:** add `.sr-only` utility class and `common.loading` i18n key (fr/en) ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))

### Bug Fixes

* **ui:** remove dead `error` signal in resend-verification — RGPD anti-enumeration preserved ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))
* **ui:** add `tokenState` guard in reset-password `submit()` to prevent HTTP call on expired token ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))
* **ui:** remove unused `CommonModule` import from reset-password ([#40](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/40))

---

## [0.1.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/0.0.0...0.1.0) (2026-06-27)

### Features

* **ui:** auth module MVP — login, register, verify-email, resend-verification, forgot-password, reset-password, device-confirm pages ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/39))
* **ui:** Angular 22, TypeScript strict, OnPush change detection, Signals, RxJS ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/39))
* **ui:** Transloco i18n (fr/en) on all auth pages ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/39))
* **ui:** OIDC PKCE S256 client via `angular-oauth2-oidc` ([#11](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/11))
* **ui:** WCAG 2.1 AA — ARIA labels, focus management, keyboard navigation ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/pull/39))

---

## [0.0.0](https://github.com/PIVOT-PLATFORM/pivot-ui/commits/0.0.0) (2026-06-20)

### Initial setup

* Angular 22 project scaffolding — TypeScript strict, esbuild, nginx Dockerfile
* GitHub Actions CI/CD : build, lint, test (Vitest), coverage, SonarCloud quality gate
* DAST workflows — ZAP baseline (mensuel) + full scan (manuel)
* SCA dépendances — Trivy + npm audit + Dependabot
* SBOM génération CycloneDX
* Secret scanning — Gitleaks
* SAST — CodeQL + Semgrep
* SLSA L3 provenance pour images Docker
* OpenSSF Scorecard
* Playwright E2E + Lighthouse accessibilité
