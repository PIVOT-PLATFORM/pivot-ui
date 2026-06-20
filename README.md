# PIVOT-UI

Frontend Angular de la suite collaborative [PIVOT](https://github.com/ApoSkunz/pivot-core).

Interface réactive, accessible (WCAG 2.1 AA), organisée par modules activables par les administrateurs.

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
