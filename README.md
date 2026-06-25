# PIVOT-UI

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=alert_status&style=for-the-badge)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/PIVOT-PLATFORM/pivot-ui/badge?style=for-the-badge)](https://securityscorecards.dev/viewer/?uri=github.com/PIVOT-PLATFORM/pivot-ui)
[![Lighthouse A11y](https://img.shields.io/badge/Lighthouse-A11y-F44B21?style=for-the-badge&logo=lighthouse&logoColor=white)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/lighthouse.yml)

[![CI](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/PIVOT-PLATFORM/pivot-ui?label=release&color=blue)](https://github.com/PIVOT-PLATFORM/pivot-ui/releases)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Node](https://img.shields.io/badge/Node-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Downloads](https://img.shields.io/github/downloads/PIVOT-PLATFORM/pivot-ui/total?label=downloads)](https://github.com/PIVOT-PLATFORM/pivot-ui/releases)
[![Docker](https://img.shields.io/badge/docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/PIVOT-PLATFORM/pivot-ui/pkgs/container/pivot-ui%2Fpivot-ui)
[![License](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

Frontend Angular de la suite collaborative [PIVOT](https://github.com/PIVOT-PLATFORM/pivot-core).

Interface réactive, accessible (WCAG 2.1 AA), organisée par modules activables par les administrateurs.

## CI/CD

[![CI](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml)
[![Release](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/release.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/release.yml)
[![E2E](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/e2e.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/e2e.yml)
[![Lighthouse](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/lighthouse.yml)
[![SBOM](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/sbom.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/sbom.yml)

## Sécurité

**Scanning actif** (secrets, SAST, supply chain, conformité CI/CD) — `security.yml` : Gitleaks · CodeQL · Semgrep OWASP · Plumber (score CI/CD)

[![Security](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/security.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/scorecard.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/scorecard.yml)
[![DAST Baseline](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/dast-baseline.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/dast-baseline.yml)
[![DAST Full](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/dast-full.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/dast-full.yml)

**Analyse statique** — SonarCloud : Security Rating · Vulnérabilités · Quality Gate

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=bugs)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 22 · TypeScript strict |
| Styles | SCSS · BEM · tokens CSS |
| Tests unitaires | Vitest |
| Tests E2E | Playwright (Chromium) |
| Auth | OIDC PKCE S256 (client Angular) |
| Build | Angular CLI |
| CI/CD | GitHub Actions · SonarCloud · Semantic Release · Plumber |
| Déploiement | Docker (nginx) |

---

## Démarrage local

**Prérequis :** Node.js 24 LTS — [pivot-core](https://github.com/ApoSkunz/pivot-core) en fonctionnement (API backend)

```bash
npm ci
cp .env.example .env
# Éditer .env : PIVOT_API_URL=http://localhost:8080
npm start
# → http://localhost:4200
```

---

## Commandes

```bash
npm start                            # Dev server
npm run build -- --configuration production  # Build production
npm run lint                         # ESLint + TypeScript
npm run test:ci                      # Vitest avec coverage
npx playwright test --project=chromium  # Tests E2E
```

---

## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

AGPL-3.0 — voir [LICENSE](LICENSE).
