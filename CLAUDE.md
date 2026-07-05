# CLAUDE.md — PIVOT-UI

## Projet

**PIVOT-UI** — frontend shell Angular de la suite collaborative PIVOT. Double rôle :

1. **Application shell** : portail (accueil, admin, compte utilisateur), header/footer, routing inter-modules, OIDC PKCE client.
2. **Librairie npm partagée** : publie `@pivot/ui-core` (GitHub Packages) — consommé par tous les repos `pivot-xxx-ui`.

Partenaire de `pivot-core` (backend Java/Spring Boot + API REST).
Design system dans **pivot-design-system** (`@pivot/design-system`) — pivot-ui le consomme et le réexporte.

**Vision :** interface réactive, accessible (WCAG 2.1 AA), activable par module — sans lock-in SaaS.

**Ce que @pivot/ui-core exporte :**

| Package | Contenu |
|---------|---------|
| `@pivot/ui-core/auth` | OidcService, AuthInterceptor, AuthGuard |
| `@pivot/ui-core/tenant` | TenantService, TenantContextDirective |
| `@pivot/ui-core/shell` | HeaderComponent, FooterComponent, NavigationService |
| `@pivot/ui-core/modules` | ModuleGuard, ModuleStatusService |
| `@pivot/design-system` | Ré-export complet de `@pivot/design-system` |

**Modules fonctionnels** : dans les repos dédiés (`pivot-pilotage-ui`, `pivot-agilite-ui`, `pivot-collaboratif-ui`). pivot-ui ne contient PAS les features métier.

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
| State | Signals Angular · NgRx si complexité croissante |
| Auth | OIDC PKCE S256 (client Angular) · angular-oauth2-oidc |
| Temps réel | WebSocket STOMP — `@stomp/rx-stomp` (ng2-stompjs deprecated, ngx-stomp non maintenu) |
| Tests unitaires | Vitest |
| Tests E2E | Playwright (Chromium) |
| i18n | Transloco — tous libellés externalisés, jamais de chaîne littérale dans les templates |
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
│   │   ├── core/              # Exporté dans @pivot/ui-core
│   │   │   ├── auth/          # OidcService, AuthInterceptor, AuthGuard
│   │   │   ├── tenant/        # TenantService, TenantContextDirective
│   │   │   ├── shell/         # HeaderComponent, FooterComponent, NavigationService
│   │   │   └── modules/       # ModuleGuard, ModuleStatusService
│   │   ├── shared/            # Composants shell partagés (pas de feature métier ici)
│   │   ├── features/          # Portail shell uniquement
│   │   │   ├── home/          # Grille modules, dashboard
│   │   │   ├── account/       # Espace compte utilisateur
│   │   │   └── admin/         # Admin tenant (modules, utilisateurs)
│   │   └── app.*.ts
│   ├── assets/
│   ├── environments/
│   └── styles/                # Global SCSS — migre vers @pivot/design-system
├── e2e/
├── .github/
│   └── workflows/
├── .plumber.yaml
└── Dockerfile                 # nginx production
```

**Features métier (whiteboard, quiz, roadmap…) → repos `pivot-xxx-ui` dédiés, jamais dans pivot-ui.**
WebSocket STOMP (`@stomp/rx-stomp`) → dans les repos modules qui en ont besoin (pivot-collaboratif-ui, etc.), pas dans pivot-ui.

Backend API → **pivot-core** (repo séparé). Design system → **pivot-design-system** (`@pivot/design-system`).

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
| **Expert OIDC / IAM** | OIDC PKCE S256 Angular, gestion tokens, rotating refresh token OIDC enterprise (géré côté serveur — jamais stocké en Local Storage/sessionStorage), claims — **silent refresh via iframe interdit** |
| **Expert QA** | Stratégie Vitest/Playwright, coverage ≥ 85 %, A11y tests |
| **Expert RGPD** | Conformité RGPD/CNIL, stockage navigateur, consentement, cookies |
| **Product Owner** | Project GitHub org backlog, Epics, US, critères d'acceptation, priorisation |
| **Scrum Master** | Coordination, sprints, impediments, backlog consistency |
| **Architecte Modules** | Lazy-loading Angular, guards d'activation, route protection par module |
| **Expert PR Review** | Relecture croisée neutre : cohérence architecture Angular, lisibilité, dette technique, respect des standards PIVOT — intervient quand les experts dev signalent "prêt pour review" |
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

## Backlog — fichiers markdown

> **Sources de vérité :**
> - Hiérarchie backlog + conventions : `pivot-docs/docs/backlog/README.md`
> - Sprints, assignation US, état avancement : **`pivot-docs/docs/backlog/SPRINTS.md`**
> - **Backlog opérationnel :** fichiers markdown dans `pivot-docs/docs/backlog/` — un fichier par US/Enabler avec frontmatter (`Stage`, `Priority`, `Phase`).

### Hiérarchie
`EPIC → FEATURE (valeur) / ENABLER (technique) → US` · clé `E01 → F01.1 / EN01.1 → US01.1.1`.

### Champs du Project

| Champ | Valeurs |
|-------|---------|
| Item Type | Epic / Feature / Enabler / US |
| Parent | clé du parent (ex. `E01`, `F01.1`) |
| Stage | Backlog / Ready / In progress / Review / Done |
| Priority | Critical / High / Medium / Low |
| Module | core / auth / admin / oidc / whiteboard / session / roadmap / survey / quiz (extensible) |
| Phase | MVP / v1-enterprise / phase-3 |
| Sprint | Sprint 1…N |
| Size | XS / S / M / L / XL |

### Template US, Definition of Ready, vagues → `pivot-docs/docs/backlog/README.md`.

---

## Breaking Points

### Step 0 — Challenge PO avant implémentation

Avant tout code, le **PO Agent** challenge les ACs de l'US :

1. Vérifier DoR — story complète, ACs Given/When/Then, AC erreur + sécurité
2. Calculer Gate 1 : **≥ 70** → procéder · **< 70** → PO Agent réécrit ACs → recalculer
3. AC ambigus à l'implémentation → PO Agent clarifie, jamais d'interprétation unilatérale

Pas de blocage humain — Claude autonome de A à Z sur la validation des ACs.

### Breaking Point 2 : Gate 4 MERGE < 60 ou hard block

Tout PR avec :
- Label `security` ou `breaking-change`
- Gitleaks secret détecté
- Modification du contrat de module sans coordination pivot-core
- Modification de la configuration OIDC Angular

→ Label `needs-human-review` + score breakdown + attendre le mainteneur.

---

## Workflow — Organisation par sprint

Travail organisé par sprint. Référence : **`pivot-docs/docs/backlog/SPRINTS.md`**.

**Principes :**
- **Une branche par US / Enabler** — `feat/{us-id}-{slug}` (ex. `feat/us03-1-1-admin-active-module`)
- **Agents en parallèle** — un agent par item du sprint, branches séparées
- **Backlog pivot-docs** — mises a jour `Stage` dans le frontmatter US + SPRINTS.md, committés sur la branche de l'US

## Workflow — Autoloop PR par US

Après implémentation sur `feat/{us-id}-{slug}` :

1. Ouvrir une PR (draft) vers `main`
2. **Autoloop** (20 itérations max) :
   - **En parallèle :**
     - **Review neutre** — Expert PR Review : architecture, AC, sécurité, dette, a11y, i18n
     - **CI** — `npx tsc --noEmit` + `npm run lint` + `npm run test:ci` + build prod = 0 erreur/warning
   - **Corrections** — tous les findings résolus, commit `fix({scope}): ...`
   - **Convergence** — Gate 4 ≥ 85 ET CI verte → sortir
3. Gate 4 vert → `Stage: Review` dans frontmatter US + SPRINTS.md + signal mainteneur
4. Blocage 20 boucles → Breaking Point 2

## Workflow — Ordre d'exécution par US (dans un sprint)

| Étape | Contenu |
|-------|---------|
| **1. Code** | Composants Angular + TSDoc · Services · Guards |
| **2. Tests** | Vitest TU composants + services — **dans le même commit** |
| **3. Qualité** | ESLint · TypeScript strict verts |
| **4. UI / i18n / A11y** | Composants Angular, styles, tokens, ARIA |
| **5. Gate 2** | Coverage check : ≥ 85 % → continuer · 70–84 % → compléter · < 70 % → stop |
| **6. Backlog** | Mise à jour SPRINTS.md + statut US **obligatoire avant commit** |
| **7. E2E** | Spec Playwright (happy path + 1 erreur critique) |
| **8. Commit** | `git add` fichier par fichier · commits atomiques sur branche `feat/{us-id}-{slug}` |

> **E2E différable** si environnement indisponible. Étapes 6 et 8 non différables.

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
| `feat/{us-id}-{slug}` | Implémentation d'une US / Enabler | `feat/us03-1-2-admin-desactive-module` |
| `fix/{id}-{slug}` | Correction bug hors sprint | `fix/67-auth-redirect-loop` |
| `refactor/{id}-{slug}` | Refactoring hors sprint | `refactor/89-signals-migration` |
| `chore/{slug}` | CI, deps, config | `chore/eslint-config` |
| `docs/{slug}` | Documentation hors sprint | `docs/adr-state-management` |

**Règles :**
- Jamais de travail direct sur `main`
- **Une branche = un item de sprint** (US ou Enabler)
- **Backlog pivot-docs et PATCH_NOTES.md committés sur la branche de l'US**
- Rebase avant merge → squash WIP
- `git push --force-with-lease` uniquement sur branches de travail

**Création de branche US — procédure obligatoire :**
```bash
git checkout main
git pull origin main
git checkout -b feat/{us-id}-{slug}
```
Branche existante → `git checkout feat/{us-id}-{slug}` directement.

---

## Workflow — Commits

Format **Conventional Commits** (`type(scope): message`) — alimente Semantic Release pour le versioning automatique.

| Commit | Contenu typique |
|--------|----------------|
| `feat(ui):` | composant Angular, service, route |
| `fix(ui):` | correction bug frontend |
| `feat(modules):` | lazy-loading, route guard, activation module |
| `fix(modules):` | correction bug module system |
| `feat(auth):` | OIDC Angular, intercepteur token, guard auth |
| `fix(auth):` | correction bug auth / session |
| `feat(ws):` | WebSocket STOMP client Angular |
| `fix(ws):` | correction bug WebSocket / STOMP |
| `test:` | ajout ou correction de tests (Vitest, Playwright) sans changement de code prod |
| `feat(a11y):` | accessibilité WCAG, attributs ARIA |
| `style(ui):` | SCSS, tokens CSS, design system |
| `ci:` | GitHub Actions workflows, Plumber |
| `docs:` | README, CLAUDE.md, ADR |
| `security:` | correctif sécurité — **hard block Gate 4, review humaine** |

Co-author sur chaque commit : `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Gates ACDD — Confidence Gates

Score 0–100, jamais booléen. Scores/décisions consignés en **commentaire de PR** (plus de
dossier `gates/`). Le statut vit dans le champ **Stage** du frontmatter US (pivot-docs).

| Gate | Moment | Seuils |
|------|--------|--------|
| **1 — READINESS** | Avant implémentation | PO Agent self-challenge · ≥ 70 → Stage: Ready → procéder · < 70 → PO Agent réécrit ACs |
| **2 — COVERAGE** | Par commit | ≥ 85 → continuer · 70–84 → compléter tests · < 70 → stop |
| **3 — QUALITY** | Après CI verte | Hard blocks : secret Gitleaks, label `security`/`breaking-change`, modif contrat module/OIDC |
| **4 — MERGE CONFIDENCE** | Avant merge | ≥ 85 → merge autonome · 60–84 → merge documenté · < 60 → Breaking Point 2 |

**Checks Gate 1 :** AC testables (40) · dépendances résolues (20) · impact contrat module (15) · AC sécurité + A11y ≥ 1 chacun (15) · pas de cycle (10)

**Checks Gate 2 :** AC couverts (50) · pas de code non testé (30) · tests non triviaux (20)

**Checks Gate 3 :** SonarCloud ≥ 80 % (25) · zéro finding critique/high (25) · linters clean (20) · Gitleaks clean (20) · build Docker (10)

**Format du commentaire de PR (gate)** : `gate` (READINESS | COVERAGE | QUALITY | MERGE_CONFIDENCE), `score`, `decision`, `breakdown`, `notes`.

---

## Agents IA — Rôles et cycle ACDD

### Philosophie

**ACDD (Acceptance Criteria Driven Development)** — gates de confiance continues.

- Gates → score (0–100), jamais booléen pass/fail
- Chaque gate → consigné en **commentaire de PR** (pas de fichier committé)
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
- SCSS BEM + tokens centralisés — pas de styles inline
- WCAG 2.1 AA sur tous les éléments interactifs (ARIA, focus, contraste)
- Pas de logique métier dans les composants — déléguer aux services
- `inject()` plutôt que constructeur pour les dépendances (Angular 14+)
- Routes lazy-loaded par feature module — jamais de barrel d'import massif
- TSDoc sur tous les services, guards et pipes publics
- i18n : **Transloco** — tous les libellés externalisés, jamais de chaîne littérale dans les templates ou services
- Garde fonctionnels (`CanActivateFn`) — jamais de classe `CanActivate` (deprecated Angular 15+)

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
| Access token | En mémoire uniquement — **jamais dans Local Storage, sessionStorage, IndexedDB ou Cookie** |
| Refresh token | Rotating refresh token (OIDC enterprise) · Opaque token TTL géré côté serveur (auth locale) · **silent refresh via iframe = interdit** (incompatible avec le modèle opaque token) |
| Guard Angular | Fonction `CanActivateFn` vérifie token valide avant navigation — **jamais de classe `CanActivate` (deprecated Angular 15+)** |
| Intercepteur | Ajoute `Authorization: Bearer {token}` sur toutes les requêtes API |

---

## Releases — PATCH_NOTES.md

`PATCH_NOTES.md` (situé à la racine de `pivot-ui/`) est mis à jour **dans chaque PR** (embarqué avec le code) :
- Ajouter les changements notables dans la section `## [Unreleased]` en tête de fichier
- Rédigé en **français**, pour l'utilisateur final — pas le développeur
- Langage naturel — pas de référence aux commits ou tickets
- Après la release SR : le script `.scripts/prepare-patch-notes.sh` renomme `[Unreleased]` automatiquement
- Fichier maintenu en place, **jamais de fichiers datés**
- **Exception** : PRs `chore` / `ci` / `docs` sans impact utilisateur visible — pas de mise à jour PATCH_NOTES

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
| Access token dans Local Storage, sessionStorage, IndexedDB ou Cookie | Vulnérable XSS — mémoire JavaScript uniquement |
| `any` TypeScript | Désactive la sécurité du typage |
| Logique métier dans les composants | Viole la séparation des couches |
| Module désactivé avec routes accessibles | Contournement restriction admin |
| Implémenter sans US tracée dans les fichiers markdown backlog | Perte de traçabilité |
| JWT (HS*/RS*) côté Angular | Remplacé par opaque tokens — jamais stocker ni parser un JWT côté client |
| `userId` passé dans le body d'une requête Angular (`/api/account/*`) | Mass assignment / IDOR — identité extraite du token porteur par le backend |
| Commiter `.env`, tokens, secrets, certificats | Exposition définitive |
| `tenantId` passé en query param ou header custom côté Angular | IDOR — tenantId toujours résolu depuis le token par le backend |
| Logique de filtrage tenant côté Angular (côté client) | Non-fiable — le backend est la seule autorité d'isolation |

---

## Règle transversale sécurité — Isolation tenant (côté Angular)

- Ne jamais passer de `tenantId` ou `userId` en query param, header custom ou body côté Angular
- L'isolation tenant est **exclusivement gérée côté backend** (TenantContext du token porteur)
- Si un endpoint retourne 403 ou 404, ne pas retry avec un autre tenantId — traiter comme une erreur finale
- Contenu affiché : utiliser **Angular interpolation `{{ val }}`** — jamais `innerHTML` avec données utilisateur

---

## Boucles de problèmes — règle d'escalade

Après **2 tentatives** (même stratégie ou variantes proches) :
1. **Stopper** — ne pas continuer à boucler
2. **Poster un commentaire de gate sur la PR** avec `decision: ESCALATED`, contexte complet, tentatives effectuées — **jamais committer un fichier de gate**
3. **Signaler** au mainteneur : blocage, tentatives, raison de l'échec — label `needs-human-review`
4. **Proposer** une alternative : approche différente, outil différent, contournement

Ne jamais enchaîner plus de 2 tentatives sans informer le mainteneur.

---

## Skills — Knowledge Cards

Index : `.project/skills/_index.yaml`

| Skill | Fichier | Charger quand |
|-------|---------|---------------|
| `skill-angular-architecture` | `skill-angular-architecture.yaml` | Tout fichier .ts / .html / .scss |
| `skill-oidc-angular` | `skill-oidc-angular.yaml` | Fichier auth/, guard, intercepteur, AC sécurité |
| `skill-module-system-angular` | `skill-module-system-angular.yaml` | Feature module, lazy-loading, route guard |
| `skill-ac-traceability` | `skill-ac-traceability.yaml` | **Toujours** — toute implémentation d'US, Gate 2, Gate 4 |
| `skill-testing-strategy` | `skill-testing-strategy.yaml` | Nouveau test Vitest, coverage < 85 %, spec Playwright |
| `skill-devops-cicd` | `skill-devops-cicd.yaml` | Fichier .github/workflows/, Dockerfile, config CI |
| `skill-accessibility` | `skill-accessibility.yaml` | Tout composant interactif, AC A11y |
| `skill-rgpd` | `skill-rgpd.yaml` | US touchant données personnelles (email, profil, contenu) |
| `skill-observability` | `skill-observability.yaml` | Nouveau log Angular, nouvelle métrique, monitoring erreurs |
| `skill-i18n` | `skill-i18n.yaml` | Fichier fr.json/en.json, pipe translate, `getActiveLang()`, langue UI |
| `skill-ux-design-system` | `skill-ux-design-system.yaml` | SCSS BEM, tokens CSS, design system, tout composant UI |
| `skill-security-redteam` | `skill-security-redteam.yaml` | US auth/données user, `[innerHTML]`, AC sécurité, rapport Red Team |
| `skill-security-blueteam` | `skill-security-blueteam.yaml` | nginx.conf, rapport Red Team reçu, gestion token Angular |
| `skill-pr-reviewer` | `skill-pr-reviewer.yaml` | Gate 3 (qualité CI), Gate 4 (décision merge), review PR |

**Règle :** avant d'écrire du code, identifier les skills applicables via l'index et les lire.
La skill `skill-ac-traceability` est toujours chargée pour toute US.

---

## Parallélisation

Lancer un maximum d'actions en parallèle dans chaque message :

| Actions parallélisables | Exemples |
|------------------------|---------|
| Lectures indépendantes | Plusieurs `Read` / `Grep` / `Glob` |
| Linters | ESLint + TypeScript lancés simultanément |
| Créations de fichiers indépendants | Composant + service + spec Vitest |
| Recherches codebase | Plusieurs `Grep` sur cibles différentes |

Ne séquencer que ce qui dépend du résultat d'une étape précédente.
