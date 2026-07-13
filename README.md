# PIVOT-UI

<div align="center">

[![CI](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/PIVOT-PLATFORM/pivot-ui?label=release&color=blue)](https://github.com/PIVOT-PLATFORM/pivot-ui/releases)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Node](https://img.shields.io/badge/Node-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Downloads](https://img.shields.io/github/downloads/PIVOT-PLATFORM/pivot-ui/total?label=downloads)](https://github.com/PIVOT-PLATFORM/pivot-ui/releases)
[![Docker](https://img.shields.io/badge/docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/PIVOT-PLATFORM/pivot-ui/pkgs/container/pivot-ui%2Fpivot-ui)
[![License](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=PIVOT-PLATFORM_pivot-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=PIVOT-PLATFORM_pivot-ui)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/PIVOT-PLATFORM/pivot-ui/badge)](https://securityscorecards.dev/viewer/?uri=github.com/PIVOT-PLATFORM/pivot-ui)
[![SLSA Level 3](https://img.shields.io/badge/SLSA-Level_3-1B6B2F?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxTDMgNXY2YzAgNS41NSAzLjg0IDEwLjc0IDkgMTIgNS4xNi0xLjI2IDktNi40NSA5LTEyVjVsLTktNHoiLz48L3N2Zz4=)](https://slsa.dev)
[![Plumber Score](https://img.shields.io/badge/Plumber-A-brightgreen?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMCAxN2wtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPjwvc3ZnPg==)](https://github.com/PIVOT-PLATFORM/pivot-ui/actions/workflows/security.yml)

</div>

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

### Écosystème complet (shell + modules + backends)

Le shell seul ne suffit pas à tester les modules métier. Pour lancer **toute la plateforme en
local** (backend, module-cores, infra, et ce shell derrière le gateway nginx sur `:80`),
l'orchestrateur est **`pivot-core`** — voir sa section *Développement local* :
<https://github.com/PIVOT-PLATFORM/pivot-core#développement-local--lancer-tout-lécosystème>.

Deux modes y sont documentés :
- **Par défaut** — le service `frontend` build ce repo et consomme les libs `@pivot-platform/*-ui`
  **publiées** (GitHub Packages, `NODE_AUTH_TOKEN` requis).
- **Offline / UI locales** — `Dockerfile.local` (ce repo) build le shell contre les libs
  `-ui` **buildées depuis les sources locales** (tarballs `local-ui-packages/`), **sans GitHub npm**.
  Piloté par `pivot-core/scripts/pack-local-ui.sh` + `pivot-core/compose.local.yml`.

Le seed des comptes de test + l'activation des modules sont aussi documentés côté pivot-core.

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
