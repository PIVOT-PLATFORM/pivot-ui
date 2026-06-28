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
