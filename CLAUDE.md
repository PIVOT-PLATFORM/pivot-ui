# CLAUDE.md — PIVOT-UI

## Projet

**PIVOT-UI** — frontend Angular de la suite collaborative PIVOT.

Partenaire de `pivot-core` (backend Java/Spring Boot + API REST).

**Vision :** interface réactive, accessible (WCAG 2.1 AA), activable par module — sans lock-in SaaS.

**Modules prévus (lazy-loaded par module activé) :**

| Module | Description | Inspiration |
|--------|-------------|-------------|
| `whiteboard` | Tableau blanc collaboratif temps réel | PouetPouet |
| `session` | Sessions live : QUIZ, POLL, WORDCLOUD, BRAINSTORM, QA | Klaxoon |
| `roadmap` | Roadmap / Gantt intégré | - |
| `survey` | Système de sondage | - |
| `quiz` | Quiz interactif gamifié | Kahoot |

**Déploiement :**
- Image Docker nginx (assets statiques + reverse proxy API)
- Livraison enterprise : OIDC PKCE S256 configurable (Keycloak, Azure AD, Okta…)

---

## Communication

Concise et directe. Techniquement précise. Pas de récapitulatifs inutiles.

**Exceptions (réponses complètes et structurées) :**
- Rédaction ou revue d'US / Epics
- Décisions d'architecture (routing, state management, design system)
- Avis cybersécurité ou actions irréversibles — **confirmation obligatoire**
- Backlog et critères d'acceptation

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 22 · TypeScript strict |
| Styles | SCSS · BEM · tokens CSS |
| HTTP | Angular HttpClient · RxJS |
| State | Signals Angular (Angular 17+) · NgRx si complexité croissante |
| Auth | OIDC PKCE S256 (client Angular) · angular-oauth2-oidc |
| Temps réel | WebSocket STOMP (ngx-stomp ou ng2-stompjs) |
| Tests unitaires | Vitest |
| Tests E2E | Playwright (Chromium) |
| Build | Angular CLI · esbuild |
| CI/CD | GitHub Actions · SonarCloud · Semantic Release · Plumber |
| Déploiement | Docker (nginx) |
| Backend | → **pivot-core** (Java 25 · Spring Boot 4.x) |

---

## Structure du dépôt

```
pivot-ui/
├── src/
│   ├── app/
│   │   ├── core/              # Services singleton, guards, interceptors, auth
│   │   ├── shared/            # Composants, pipes, directives réutilisables
│   │   ├── features/          # Feature modules lazy-loaded par module PIVOT
│   │   │   ├── whiteboard/
│   │   │   ├── session/
│   │   │   ├── roadmap/
│   │   │   ├── survey/
│   │   │   └── quiz/
│   │   └── app.*.ts           # Root component / config / routes
│   ├── assets/
│   ├── environments/
│   └── styles/                # Global SCSS, tokens, variables
├── e2e/                       # Specs Playwright
├── gates/                     # Artifacts ACDD (us-{id}/gate-{n}.yaml)
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── .plumber.yaml              # Config Plumber (CI/CD compliance)
└── Dockerfile                 # nginx production
```

Backend API → **pivot-core** (repo séparé).

---

## Équipe experte

Toute contribution mobilise les experts concernés — les mentionner explicitement dans la réponse.

| Expert | Domaine |
|--------|---------|
| **Architecte Angular** | Architecture Angular, modules lazy-loaded, RxJS, Signals, OnPush |
| **Expert UX/UI** | Design system SCSS, accessibilité WCAG 2.1 AA, tokens CSS, Figma |
| **Expert DevSecOps** | CI/CD GitHub Actions, SonarCloud, Semgrep, Gitleaks, Plumber, SBOM |
| **Expert Red Team** | XSS, CSRF, OIDC bypass frontend, exposition tokens, clickjacking |
| **Expert Blue Team** | CSP, SRI, headers sécurité nginx, réponse aux rapports Red Team |
| **Expert OIDC / IAM** | OIDC PKCE S256 Angular, gestion tokens, silent refresh, claims |
| **Expert QA** | Stratégie Vitest/Playwright, coverage ≥ 80 %, A11y tests |
| **Expert RGPD** | Conformité RGPD/CNIL, stockage navigateur, consentement, cookies |
| **Product Owner** | GitHub Issues backlog, Epics, US, critères d'acceptation, priorisation |
| **Scrum Master** | Coordination, sprints, impediments, backlog consistency |
| **Architecte Modules** | Lazy-loading Angular, guards d'activation, route protection par module |
| **Experts Java / Backend** | → **pivot-core** |

### Faire appel aux experts

| Type de tâche | Expert(s) |
|---------------|-----------|
| Composant Angular, SCSS, routing | **Architecte Angular** + **Expert UX/UI** |
| Guards, interceptors, lazy-loading | **Architecte Angular** + **Architecte Modules** |
| Design system, tokens CSS, A11y | **Expert UX/UI** |
| Auth OIDC, gestion tokens Angular | **Expert OIDC / IAM** + **Expert Blue Team** |
| Tests Vitest, Playwright, coverage | **Expert QA** |
| CI/CD, GitHub Actions, Plumber | **Expert DevSecOps** |
| Vulnérabilité sécurité frontend | **Expert Red Team** → **Expert Blue Team** |
| RGPD, cookies, stockage navigateur | **Expert RGPD** |
| Backlog, US, acceptance criteria | **Product Owner** |
| Module activation, route guards | **Architecte Modules** |
| Bug inexpliqué | **Architecte Angular** en premier, puis **Expert Red Team** si suspicion sécurité |
| API REST, backend Java | → **pivot-core** |

**Règles :**
- Mentionner l'expert explicitement quand son domaine est engagé.
- Toute faille Red Team = correction Blue Team **avant** tout merge.
- Changement du contrat de module = coordination avec pivot-core obligatoire.

---

## Backlog — GitHub Issues + Projects

> Projet open-source → GitHub Issues publiques (contributions externes possibles, roadmap visible, CI peut labeler automatiquement).

### Hiérarchie

```
Epic (issue parent, label "epic")
└── User Stories (issues enfants, label "us", liées via "tracked by")
```

### Template US (`.github/ISSUE_TEMPLATE/user-story.yml`)

```markdown
En tant que [admin / utilisateur / participant anonyme]
Je veux [action]
Afin de [bénéfice]

Critères d'acceptation :
- [ ] Given [contexte], when [action], then [résultat observable]
- [ ] Error case: given [input invalide], system affiche [message / redirection]
- [ ] Security: [propriété de sécurité garantie]
- [ ] A11y: [propriété d'accessibilité WCAG garantie]

Module cible : pivot-{module}
Estimation : XS / S / M / L / XL
Dépendances : #xxx (si applicable)
```

### Champs GitHub Projects

| Champ | Type | Valeurs |
|-------|------|---------|
| Status | Select | Backlog / Ready / In progress / Review / Done |
| Priority | Select | Critical / High / Medium / Low |
| Module | Select | core / whiteboard / session / roadmap / survey / quiz / auth / admin |
| Phase | Select | MVP / v1-enterprise / phase-3 |
| Size | Select | XS / S / M / L / XL |

### Mise à jour des statuts (Claude)

- Claude met le statut à **"Review"** quand une US est implémentée (Gate 2 vert)
- Le mainteneur valide → statut **"Done"**
- US bloquée → **"Backlog"** + note explicative
- Ne jamais laisser un statut obsolète

---

## Breaking Points — Validation humaine obligatoire

### Breaking Point 1 : Avant toute implémentation d'US

Demander explicitement la validation du mainteneur sur **deux points** :

**1. L'US elle-même** — confirmer que c'est la prochaine à traiter :
> "Je m'apprête à implémenter `us-{slug}` (priorité X, estimation Y).
> Tu confirmes que c'est bien la prochaine, ou tu veux réorienter ?"

**2. Les critères d'acceptation** — présenter la liste et attendre le feu vert :
> "Voici les critères d'acceptation : [liste Given/When/Then + A11y].
> Tu valides, ou tu veux ajouter / modifier / retirer ?"

**Pourquoi :** critères mal cadrés en amont = composants à refaire. Le mainteneur valide **avant** que Claude écrive la moindre ligne de code de production.

**Exceptions (pas de consultation requise) :**
- Correctifs sécurité sur vecteur exploitable immédiatement
- ESLint / TypeScript / tests cassés bloquant la CI
- Bugs dont la cause racine est clairement identifiée

### Breaking Point 2 : Gate 4 MERGE < 60 ou hard block

Tout PR avec :
- Label `security` ou `breaking-change`
- Gitleaks secret détecté
- Modification du contrat de module sans coordination pivot-core
- Modification de la configuration OIDC Angular

→ Label `needs-human-review` + score breakdown + attendre le mainteneur.

---

## Workflow — Ordre d'exécution par US

| Étape | Contenu |
|-------|---------|
| **1. Code** | Composants Angular + TSDoc · Services · Guards |
| **2. Tests** | Vitest (TU composants + services) — **dans le même commit** |
| **3. Qualité** | ESLint · TypeScript strict verts |
| **4. UI / A11y / SCSS** | Composants Angular, styles, tokens, attributs ARIA |
| **5. Backlog** | Mettre à jour le statut de l'US dans GitHub Issues · **obligatoire avant commit** |
| **6. E2E** | Spec Playwright (happy path + 1 erreur critique) |
| **7. Commit** | `git add` fichier par fichier · commits atomiques · branche `feat/us-{id}-{slug}` |

> **E2E différable** si environnement indisponible. Étapes 5 et 7 non différables.

### Approche tests

Écrire le code d'abord, puis les tests couvrant toutes les branches et conditions limites. TDD strict non utilisé.

**Exception :** quand le contrat d'un service ou d'un guard est flou — écrire les tests en premier pour forcer la clarification.

---

## Workflow — Vérifications avant push autonome

**Condition absolue avant tout push autonome : 0 erreur, 0 warning.**

Claude exécute ces commandes **sans attendre d'instruction** :

```bash
npx tsc --noEmit                              # TypeScript strict (0 erreur)
npm run lint                                  # ESLint (0 warning)
npm run test:ci                               # Vitest coverage
npm run build -- --configuration production   # Build prod (doit réussir)
```

Rapporter ✅ ou stderr complet. Toute erreur ou warning non justifié = **stop, corriger avant push**.

---

## Workflow — Branches

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `feat/us-{id}-{slug}` | Nouvelle US | `feat/us-42-whiteboard-toolbar` |
| `fix/{id}-{slug}` | Correction de bug | `fix/67-auth-redirect-loop` |
| `refactor/{id}-{slug}` | Refactoring | `refactor/89-signals-migration` |
| `chore/{slug}` | CI, deps, config | `chore/eslint-config` |
| `docs/{slug}` | Documentation | `docs/adr-state-management` |

**Règles :**
- Jamais de travail direct sur `main`
- Une branche = une US = une PR
- Rebase avant merge : `git rebase -i origin/main` → squash WIP
- `git push --force-with-lease` uniquement sur branches de travail

---

## Workflow — Commits

Format **Conventional Commits** (`type(scope): message`) — alimente Semantic Release pour le versioning automatique.

| Commit | Contenu typique |
|--------|----------------|
| `feat(ui):` | composant Angular, service, route |
| `feat(modules):` | lazy-loading, route guard, activation module |
| `feat(auth):` | OIDC Angular, intercepteur token, guard auth |
| `feat(ws):` | WebSocket STOMP client Angular |
| `feat(a11y):` | accessibilité WCAG, attributs ARIA |
| `style(ui):` | SCSS, tokens CSS, design system |
| `ci:` | GitHub Actions workflows, Plumber |
| `docs:` | README, CLAUDE.md, ADR |
| `security:` | correctif sécurité — **hard block Gate 4, review humaine** |

Co-author sur chaque commit : `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Gates ACDD — Confidence Gates

Chaque gate produit un artifact YAML dans `gates/us-{id}/`. Score 0–100, jamais booléen.

| Gate | Moment | Seuils |
|------|--------|--------|
| **1 — READINESS** | Avant implémentation | ≥ 70 → Breaking Point 1 · < 70 → clarification PO |
| **2 — COVERAGE** | Par commit | ≥ 85 → continuer · 70–84 → compléter tests · < 70 → stop |
| **3 — QUALITY** | Après CI verte | Hard blocks : secret Gitleaks, label `security`/`breaking-change`, modif contrat module/OIDC |
| **4 — MERGE CONFIDENCE** | Avant merge | ≥ 85 → merge autonome · 60–84 → merge documenté · < 60 → Breaking Point 2 |

**Checks Gate 1 :** AC testables (40) · dépendances résolues (20) · impact contrat module (15) · AC sécurité + A11y ≥ 1 chacun (15) · pas de cycle (10)

**Checks Gate 2 :** AC couverts (50) · pas de code non testé (30) · tests non triviaux (20)

**Checks Gate 3 :** SonarCloud ≥ 80 % (25) · zéro finding critique/high (25) · linters clean (20) · Gitleaks clean (20) · build Docker (10)

**Format artifact** `gates/us-{id}/gate-{n}.yaml` :
```yaml
gate: READINESS
us_id: 42
score: 87
decision: VALIDATE_WITH_PO
executed_by: Claude
timestamp: 2026-06-20T10:00Z
breakdown: { ... }
notes: ""
```

---

## Agents IA — Rôles et cycle ACDD

### Philosophie

**ACDD (Acceptance Criteria Driven Development)** — gates de confiance continues.

- Gates → score (0–100), jamais booléen pass/fail
- Chaque gate → artifact YAML committé dans `gates/` — pas réponse chat
- Breaking Points = seuls moments d'intervention humaine obligatoire

### Rôles

| Agent | Responsabilité |
|-------|---------------|
| **PO Agent** | Génère Epics et US, rédige AC, clarifie AC ambigus |
| **Architect Agent** | Valide AC techniques Angular, identifie impact contrat de module |
| **Security Agent** | Challenge AC (XSS, OIDC bypass), valide fixes CSP/SRI |
| **Dev Agent** | Implémente sur branche dédiée, s'auto-évalue via gates |
| **QA Agent** | Rédige specs Playwright, valide coverage Vitest, challenge A11y |
| **PR Review Agent** | Exécute Gate 3 + Gate 4, merge ou escalade selon score |

---

## Standards de code

### Angular (frontend)

- TypeScript strict — pas de `any`
- OnPush change detection par défaut (`ChangeDetectionStrategy.OnPush`)
- Signals Angular pour le state local — `signal()`, `computed()`, `effect()`
- RxJS pour l'asynchrone HTTP et WebSocket — pas de Promise sauf interop
- SCSS BEM ou tokens centralisés — pas de styles inline
- WCAG 2.1 AA sur tous les éléments interactifs (ARIA, focus, contraste)
- Pas de logique métier dans les composants — déléguer aux services
- `inject()` plutôt que constructeur pour les dépendances (Angular 14+)
- Routes lazy-loaded par feature module — jamais de barrel d'import massif

### Général

- Pas de secrets dans le code — variables d'environnement
- **`// NOSONAR` : zéro, jamais.** Tout faux positif Sonar se marque côté SonarCloud (UI "Won't fix" / "False positive", ou exclusion centralisée) — aucune exception.
- **`// nosemgrep` : interdit par défaut**, autorisé **uniquement avec la validation explicite du mainteneur**. Sans validation, exclusion côté config Semgrep (`.semgrepignore` / `--exclude-rule`), jamais en commentaire inline.

---

## Système de modules (côté Angular)

- Chaque module PIVOT → feature module lazy-loaded (`loadChildren`)
- Module désactivé = route inaccessible (guard vérifie état via API) + aucun bundle chargé
- Guard d'activation : appel API `/api/modules/{id}/status` → 403 si désactivé
- Aucune logique inter-module directe — communication via services core partagés
- Changement de contrat de module = **hard block Gate 4 + coordination pivot-core obligatoire**

---

## Auth OIDC (côté Angular)

| Flux | Détail |
|------|--------|
| PKCE S256 | Standard — pas de client_secret côté navigateur |
| Access token | En mémoire uniquement — jamais dans Local Storage ou Cookie |
| Refresh token | Silent refresh via iframe OIDC ou rotating refresh token |
| Guard Angular | `canActivate` vérifie token valide avant navigation |
| Intercepteur | Ajoute `Authorization: Bearer {token}` sur toutes les requêtes API |

---

## Audits

Dans **pivot-docs** — un fichier par catégorie, mis à jour en place. **Jamais de fichiers datés.**

---

## Règles absolues

| Interdit | Raison |
|----------|--------|
| `--no-verify` | Contourne les hooks qualité |
| `git push --force` sur `main` | Jamais — le mainteneur uniquement si nécessaire |
| `git add .` en bloc | Risque d'inclure `.env`, clés, tokens |
| Merger avec label `security` sans revue humaine | Hard block Gate 4 |
| Commiter `.env`, tokens, secrets | Exposition définitive |
| Access token dans Local Storage | Vulnérable XSS — mémoire uniquement |
| `any` TypeScript | Désactive la sécurité du typage |
| Logique métier dans les composants | Viole la séparation des couches |
| Module désactivé avec routes accessibles | Contournement restriction admin |
| Implémenter sans US tracée dans GitHub Issues | Perte de traçabilité |

---

## Boucles de problèmes — règle d'escalade

Après **2 tentatives** (même stratégie ou variantes proches) :
1. **Stopper** — ne pas continuer à boucler
2. **Committer l'artifact de gate** avec `decision: ESCALATED` et contexte complet
3. **Signaler** au mainteneur : blocage, tentatives, raison de l'échec — label `needs-human-review`
4. **Proposer** une alternative : approche différente, outil différent, contournement

---

## Skills — Knowledge Cards

Index : `.project/skills/_index.yaml`

| Skill | Fichier | Charger quand |
|-------|---------|---------------|
| Angular Architecture | `skill-angular-architecture.yaml` | Tout fichier .ts / .html / .scss |
| OIDC & Auth Angular | `skill-oidc-angular.yaml` | Fichier auth/, guard, intercepteur, AC sécurité |
| Module System Angular | `skill-module-system-angular.yaml` | Feature module, lazy-loading, route guard |
| AC Traceability | `skill-ac-traceability.yaml` | **Toujours** — toute implémentation d'US, Gate 2, Gate 4 |
| Testing Strategy | `skill-testing-strategy.yaml` | Nouveau test Vitest, coverage < 80 %, spec Playwright |
| DevOps CI/CD | `skill-devops-cicd.yaml` | Fichier .github/workflows/, Dockerfile, config CI |
| Accessibility | `skill-accessibility.yaml` | Tout composant interactif, AC A11y |
| RGPD | `skill-rgpd.yaml` | US touchant données personnelles (email, profil, contenu) |

**Règle :** avant d'écrire du code, identifier les skills applicables via l'index et les lire.
La skill `pivot-ac-traceability` est toujours chargée pour toute US.

---

## Parallelisation

Lancer un maximum d'actions en parallèle dans chaque message :

| Actions parallélisables | Exemples |
|------------------------|---------|
| Lectures indépendantes | Plusieurs `Read` / `Grep` / `Glob` |
| Linters | ESLint + TypeScript lancés simultanément |
| Créations de fichiers indépendants | Composant + service + spec Vitest |
| Recherches codebase | Plusieurs `Grep` sur cibles différentes |

Ne séquencer que ce qui dépend du résultat d'une étape précédente.
