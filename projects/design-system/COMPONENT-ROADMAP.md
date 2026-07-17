# PIVOT Design System — plan de composants

> Feuille de route pour porter le design system au niveau « socle complet » attendu par
> l'ADR-007. Document de planification (non contractuel) — les vagues retenues alimenteront
> le backlog `pivot-docs` (Enablers `EN17.x` / futurs `E-DS`).
>
> Cadre technique : **Angular CDK (comportement/a11y) + SCSS BEM custom (visuel)** — aucune lib
> visuelle tierce (ADR-007). Composants standalone, `ChangeDetectionStrategy.OnPush`, sélecteur
> `pivot-ds-*`, libellés **toujours** en clés Transloco, icônes **Lucide** (SVG inline).

---

## 1. État des lieux (13/07/2026)

### Ce qui existe déjà

**Composants Angular (3)** — `src/components/`
| Composant | Rôle | CDK | Statut |
|---|---|---|---|
| `pivot-ds-confirm-dialog` | Modale de confirmation | `FocusTrap` overlay | Stable |
| `pivot-ds-toast` (+ `ToastService`) | Notifications | signal state | Stable côté shell |
| `pivot-ds-password-strength` (+ `PasswordPolicyService`) | Jauge de robustesse MDP | — | Stable |

**Catalogue SCSS (classes globales, pas des composants)** — `src/scss/`
- `tokens.scss` — **complet** : ramps brand/accent/neutres/sémantiques 50→950, surfaces, glass,
  typo Fira, rayons, ombres, transitions, dark mode `[data-theme="dark"]`.
- `components.scss` — `.btn*` (primary/secondary/danger/ghost/lg/full), `.card`, `.form-*`
  (group/label/control/error/hint/success), `.alert`, `.spinner`, `.divider-text`, `.sr-only`.
- `patterns.scss` — 18 motifs `pv-*` : `pv-page-header`, `pv-card(-grid)`, `pv-icon-tile`,
  `pv-badge`, `pv-dot`, `pv-avatar`, `pv-glyph`, `pv-chip`, `pv-segmented`, `pv-stat-card`,
  `pv-empty-state`, `pv-add-tile`, `pv-skeleton`, `pv-modal(-overlay)`, `pv-glass-card/input`,
  + les tons `pv-tone-*` (source unique de la couleur d'état).

### Le gap

L'ADR-007 promet un **socle de composants Angular** :
`Button · Input · Select · Textarea · Card · Modal · Toast · Badge · Avatar · Spinner · Tabs · Table`.
Aujourd'hui **aucun** de ces éléments (hors Modal/Toast) n'existe en composant — ils sont posés en
HTML brut + classe globale dans chaque écran. Mesuré dans le shell `pivot-ui` :

| Signal | Compte | Lecture |
|---|---|---|
| `<select>` natifs | 31 | pas de composant Select — accessibilité/UX à la main partout |
| fichiers avec `form-*` | 20 | champs recomposés à la main écran par écran |
| fichiers avec `.btn` | 25 | pas de composant Button (états loading/disabled ad hoc) |
| `<table>` natifs | 7 | pas de composant Table (tri/pagination réécrits) |

**Duplication inter-modules réelle** (scan des 4 UI) : **uniquement le Toast** — `pivot-ui` a
l'implémentation complète, `collaboratif`/`pilotage` ont des stubs console, `agilité` une variante
signal divergente. Tout le reste est shell-only ou à créer pour les modules encore bootstrap
(`agilité`/`pilotage` n'ont qu'un `HomeComponent`).

### Conséquence sur la charge

La charte visuelle **existe déjà en SCSS**. Pour la majorité des composants, le travail n'est donc
pas du design mais de l'**emballage** : composant standalone fin qui pose les classes `pv-*`/`.btn`
existantes + comportement & a11y via CDK + `ControlValueAccessor` pour les champs + story Storybook
+ test axe-core. Cela réduit fortement le risque et rend les vagues parallélisables.

---

## 2. Principes de conception (rappel ADR-007)

1. **Un composant = un fin wrapper** autour d'une classe SCSS canonique existante quand elle existe ;
   on ne redéclare jamais de couleur/taille en dur (règle d'or : `var(--*)` ou classe `pv-*`).
2. **Comportement & a11y via `@angular/cdk`** : `Overlay`, `A11yModule` (FocusTrap, LiveAnnouncer,
   roving tabindex), `cdk/menu`, `cdk/listbox`, `cdk/table`, `cdk/stepper`, `cdk/tree`.
3. **Champs de formulaire = `ControlValueAccessor`** — intégration Reactive Forms native
   (`formControlName`), état `disabled`/`touched`/`invalid` propagé, `aria-describedby` vers l'erreur.
4. **i18n** : aucun libellé en dur — l'appelant passe des clés Transloco (cf. `ToastService`).
5. **Icônes Lucide** en SVG inline tree-shakeable (ADR-007) — implique un composant `pivot-ds-icon`
   fondateur (aujourd'hui absent : dette à créer en vague 0).
6. **Chaque composant livre** : story Storybook (source de vérité visuelle) + test unitaire Vitest +
   test a11y axe-core + entrée dans `public-api.ts` + doc token/variantes.
7. **Versioning strict** : un changement de token ou de contrat d'input = breaking potentiel pour les
   modules → semver + CHANGELOG.

---

## 3. Inventaire cible des composants

Statut : **✅ existe** · **♻ emballer** (SCSS déjà là) · **🆕 créer** (comportement CDK à écrire).
Effort : S (≤0,5 j) · M (~1 j) · L (2–3 j) · XL (>3 j, itératif).

### A. Champs de formulaire (ControlValueAccessor)
| Composant | Statut | SCSS réutilisable | CDK / clé technique | Effort |
|---|---|---|---|---|
| `pivot-ds-button` | ♻ | `.btn*` | — (état `loading`/`disabled`, `icon`, `type`) | S |
| `pivot-ds-form-field` | 🆕 | `.form-group/label/error/hint` | conteneur label+contrôle+erreur, `aria-describedby` | M |
| `pivot-ds-input` | ♻ | `.form-control` | CVA, préfixe/suffixe/icône | M |
| `pivot-ds-textarea` | ♻ | `.form-control` | CVA, auto-resize (`cdkTextareaAutosize`) | S |
| `pivot-ds-select` | 🆕 | `.form-control` + overlay | `cdk/listbox` + `Overlay`, mono/multi, recherche | L |
| `pivot-ds-checkbox` | 🆕 | à ajouter (mineur) | CVA, `aria-checked`, indéterminé | S |
| `pivot-ds-radio-group` | 🆕 | à ajouter (mineur) | roving tabindex (`A11yModule`), CVA | M |
| `pivot-ds-switch` | 🆕 | `pv-segmented` (proche) | CVA, `role="switch"` | S |
| `pivot-ds-datepicker` | 🆕 | à créer | `Overlay` + calendrier maison (pas de lib) | XL |
| `pivot-ds-autocomplete` | 🆕 | `.form-control` + overlay | `cdk/listbox` + filtrage async | L |

### B. Overlays & surfaces flottantes (CDK Overlay)
| Composant | Statut | SCSS réutilisable | CDK / clé technique | Effort |
|---|---|---|---|---|
| `pivot-ds-dialog` (+ `DialogService`) | ♻ | `pv-modal(-overlay)` | généralise `confirm-dialog` → `cdk/dialog`, tailles/scroll | M |
| `pivot-ds-drawer` | 🆕 | à ajouter | `Overlay` positionné (side panel), FocusTrap, Escape | M |
| `pivot-ds-menu` (dropdown) | 🆕 | à ajouter | `cdk/menu` (clavier, sous-menus) | M |
| `pivot-ds-tooltip` (directive) | 🆕 | à ajouter | `Overlay` + `aria-describedby`, délais | S |
| `pivot-ds-popover` | 🆕 | `pv-card` | `Overlay` (contenu riche vs tooltip texte) | M |
| `pivot-ds-toast` | ✅→♻ | (dans composant) | **réconcilier 4 impl.** + `LiveAnnouncer` | M |

### C. Navigation & mise en page
| Composant | Statut | SCSS réutilisable | CDK / clé technique | Effort |
|---|---|---|---|---|
| `pivot-ds-page-header` | ♻ | `pv-page-header` | projection titre/icône/sous-titre/actions | S |
| `pivot-ds-tabs` | 🆕 | à ajouter | `role=tablist` + roving tabindex, lazy content | M |
| `pivot-ds-accordion` | 🆕 | à ajouter | `cdk/accordion`, `aria-expanded` | S |
| `pivot-ds-stepper` | 🆕 | à ajouter | `cdk/stepper` (linéaire/optionnel) | M |
| `pivot-ds-breadcrumb` | 🆕 | à ajouter | `nav[aria-label]` + séparateurs | S |
| `pivot-ds-pagination` | 🆕 | à ajouter | contrôles + `aria-current` | S |
| `pivot-ds-segmented` | ♻ | `pv-segmented` | toggle segmenté (émet la valeur) | S |

### D. Affichage de données
| Composant | Statut | SCSS réutilisable | CDK / clé technique | Effort |
|---|---|---|---|---|
| `pivot-ds-card` | ♻ | `pv-card` / `.card` | header/body/footer + `--interactive` | S |
| `pivot-ds-badge` | ♻ | `pv-badge` + `pv-tone-*` | ton en input, variantes `--square/--fixed` | S |
| `pivot-ds-chip` (+ list) | ♻ | `pv-chip` | supprimable, `cdk/listbox` si sélectionnable | M |
| `pivot-ds-avatar` | ♻ | `pv-avatar` + tons | initiales/image, tailles xs→lg | S |
| `pivot-ds-glyph` | ♻ | `pv-glyph` + tons | lettre/icône carrée | S |
| `pivot-ds-stat-card` | ♻ | `pv-stat-card` | label/valeur/hint, `--accent` | S |
| `pivot-ds-table` | 🆕 | à ajouter | `cdk/table` + tri + sticky + `scope=col` | L |
| `pivot-ds-list` / `list-item` | 🆕 | à ajouter | sémantique liste, densités | S |
| `pivot-ds-tree` | 🆕 | à ajouter | `cdk/tree` (futur : arbo whiteboard/portefeuille) | L |

### E. Feedback & état
| Composant | Statut | SCSS réutilisable | CDK / clé technique | Effort |
|---|---|---|---|---|
| `pivot-ds-alert` | ♻ | `.alert` | variantes info/success/warning/error, dismissible | S |
| `pivot-ds-spinner` | ♻ | `.spinner` | tailles, `aria-busy`/label | S |
| `pivot-ds-progress-bar` | 🆕 | à ajouter | `role=progressbar`, déterminé/indéterminé | S |
| `pivot-ds-skeleton` | ♻ | `pv-skeleton` | respecte `prefers-reduced-motion` (déjà géré) | S |
| `pivot-ds-empty-state` | ♻ | `pv-empty-state` | icône/titre/texte/action | S |

### F. Fondations transverses
| Élément | Statut | Rôle | Effort |
|---|---|---|---|
| `pivot-ds-icon` | 🆕 | wrapper Lucide SVG inline (dépendance de B/C/D/E) | M |
| directive `pvTone` | 🆕 (option) | applique `pv-tone-*` par input plutôt qu'en classe | S |
| `A11yModule` helpers | 🆕 | `LiveAnnouncer` partagé, tokens focus-ring | S |

**Total cible ≈ 40 composants/directives** (dont 3 livrés, ~11 emballages SCSS, ~26 à créer).

---

## 4. Plan par vagues

Ordre = déblocage maximal (fondations → socle formulaires qui refactorise le shell et équipe les
modules → overlays → données → avancé). Chaque composant d'une vague est parallélisable (un
Enabler/branche par composant).

### Vague 0 — Fondations & dette (prérequis)
> Débloque tout le reste et supprime la seule duplication réelle.
- **`pivot-ds-icon`** (Lucide) — dépendance de la moitié des composants.
- **Réconciliation `ToastService`** — normaliser les 4 implémentations, publier, brancher
  collaboratif/agilité/pilotage sur le DS (retire les stubs/variantes). *Urgence n°1.*
- **`pivot-ds-form-field`** — conteneur label/erreur/hint, socle des champs.
- Chaîne qualité : brancher axe-core en CI, réactiver Storybook (branche `chore/storybook-toolchain`
  en cours), gabarit de test CVA.

### Vague 1 — Socle formulaires (ADR-007)
> Refactorise les 31 `<select>` / 20 écrans de formulaire du shell **et** équipe les modules.
- `button` · `input` · `textarea` · `select` · `checkbox` · `radio-group` · `switch`

### Vague 2 — Overlays & feedback
> Généralise l'existant et couvre les besoins d'interaction courants.
- `dialog` (+ `DialogService`, absorbe `confirm-dialog`) · `menu` · `tooltip` · `alert` ·
  `spinner` · `progress-bar` · `skeleton` · `empty-state`

### Vague 3 — Affichage de données & navigation
> Emballages `pv-*` (rapides) + Table (structurant pour admin/portefeuille).
- `card` · `badge` · `chip` · `avatar` · `glyph` · `stat-card` · `page-header` · `segmented` ·
  `tabs` · `accordion` · `pagination` · `breadcrumb` · `table`

### Vague 4 — Avancé
> À la demande des modules (dates, arbo, assistants).
- `datepicker` · `autocomplete` · `drawer` · `popover` · `stepper` · `list` · `tree` · `pvTone`

**Recommandation de démarrage** : Vague 0 en priorité (Toast + icon + form-field + CI axe), puis
Vague 1 en fan-out. Les vagues 3-emballages peuvent avancer en parallèle de la vague 1 car sans
dépendance (juste `pv-*` + éventuellement `icon`).

---

## 5. Definition of Done par composant

- [ ] Standalone, `OnPush`, sélecteur `pivot-ds-*`, exporté dans `public-api.ts`.
- [ ] Zéro couleur/taille en dur — tokens `var(--*)` ou classe `pv-*`/`.btn`/`.form-*`.
- [ ] Champs : `ControlValueAccessor` complet (`formControlName`, `disabled`, `touched`).
- [ ] A11y : rôle/ARIA corrects, navigation clavier, focus visible, `prefers-reduced-motion`.
- [ ] Aucun libellé en dur — clés Transloco côté appelant.
- [ ] Dark mode vérifié (`[data-theme="dark"]`).
- [ ] Story Storybook (variantes + story a11y) + test unitaire Vitest + test axe-core vert.
- [ ] Entrée `DESIGN-SYSTEM.md` (motif/variantes) mise à jour.

---

## 6. Risques & points ouverts

- **Publication du package** — le DS n'est pas encore consommé publié par les modules (gap
  EN17.2/EN17.3 : shim `pivot-ui/projects/design-system` vs paquet `@pivot-platform/design-system`).
  Chaque composant livré doit atterrir dans **les deux copies** tant que la dédup n'est pas faite,
  ou accélérer EN17.2 pour supprimer le shim.
- **Storybook** — retiré au bootstrap pour incompat Angular 22 puis réintroduit (branche
  `chore/storybook-toolchain`) ; à stabiliser avant la vague 1 pour tenir la DoD.
- **Datepicker** — décision maison (pas de lib) = coût XL réel ; à ne lancer que sur besoin module
  confirmé, sinon input `type=date` natif stylé en attendant.
- **Table** — arbitrer tôt le périmètre (tri/pagination/sélection/sticky) : sur-ingénierie facile.
- **Worktrees actifs** — `.ds-worktrees/wt-a11y-edit` et `wt-sb` indiquent des sessions DS en cours
  (a11y/axe, storybook) ; coordonner avant d'ouvrir des branches composants pour éviter les conflits.
