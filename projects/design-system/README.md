# @pivot/design-system — Librairie Angular workspace (EN17.8)

> **Statut :** Incubation dans `pivot-ui` workspace — pas encore publiée sur npm.
> Publication prévue lors de la création du repo `pivot-design-system` (EN17.2).

## Présentation

Librairie Angular workspace incubée dans `pivot-ui` pour industrialiser la
stack design system en amont de l'extraction en repo dédié (EN17.2).

Stack actée par **ADR-007** (`pivot-docs/docs/adr/ADR-007-design-system-angular-cdk.md`) :
- **@angular/cdk** — comportement/a11y (Overlay, FocusTrap, A11y)
- **SCSS BEM custom** — visuel (tokens CSS custom properties)
- Aucune lib visuelle tierce — Material/Taiga/PrimeNG/Tailwind **explicitement interdits**

## Structure ADR-007

```
projects/design-system/src/
├── tokens/          # Futurs tokens TypeScript / injection tokens Angular
├── cdk/             # Wrappers CDK (Overlay, FocusTrap, A11y) à venir
├── components/      # Composants partagés (confirm-dialog, toast, password-strength)
│   ├── confirm-dialog/     # CDK FocusTrap — première brique a11y
│   ├── toast/              # Service + container toast global
│   └── password-strength/  # Indicateur de robustesse mot de passe
└── scss/            # SCSS globaux migrés depuis src/styles/
    ├── tokens.scss          # Design tokens CSS custom properties (--pivot-*)
    ├── reset.scss           # Reset CSS (box-sizing, marges, typographie)
    └── components.scss      # Classes utilitaires (btn, form-control, alert…)
```

Point d'entrée unique : `src/public-api.ts`

## Règle d'indépendance (EN17.8 critère 2)

**La librairie n'importe AUCUN service applicatif de `pivot-ui`.**

Imports autorisés :
- `@angular/*` (framework)
- `@angular/cdk` (comportement/a11y)
- `@jsverse/transloco` (i18n framework — pas les fichiers de traduction de l'app)
- `rxjs`

Imports interdits (enforced par ESLint `no-restricted-imports`) :
- `../../app/**`, `**/app/core/**`, `**/app/shared/**`
- `**/environments/**` — utiliser `DESIGN_SYSTEM_API_URL` injection token à la place

## Composants incubés (EN17.8 critère 6)

| Composant | Sélecteur lib | Source app (conservée) |
|-----------|---------------|------------------------|
| ConfirmDialogComponent | `pivot-ds-confirm-dialog` | `src/app/shared/confirm-dialog/` |
| ToastComponent + ToastService | `pivot-ds-toast-container` | `src/app/shared/toast/` |
| PasswordStrengthComponent | `pivot-ds-password-strength` | `src/app/shared/components/password-strength/` |

**L'app continue d'importer depuis `src/app/shared/` pour l'instant.**
La migration complète des imports se fera quand `@pivot/design-system` sera publié (EN17.2).

## Migration CDK — confirm-dialog (EN17.8 critère 5)

`ConfirmDialogComponent` est la **première brique CDK** de la librairie :
- `FocusTrapFactory` (@angular/cdk/a11y) piège le focus dans la modale
- Remplacement du focus-trap manuel (querySelectorAll + Tab/Shift+Tab) par CDK
- Escape ferme la modale via `(keydown.escape)` Angular binding
- Focus restauré à l'élément déclencheur à la fermeture

## SCSS migrés (EN17.8 critère 3)

`src/styles.scss` importe depuis `projects/design-system/src/scss/` :
```scss
@use '../projects/design-system/src/scss/tokens';
@use '../projects/design-system/src/scss/reset';
@use '../projects/design-system/src/scss/components';
```

Les fichiers `src/styles/tokens.scss`, `reset.scss`, `components.scss` restent
comme documentation de transition — ils seront supprimés à EN17.2.

## Critère de déclenchement de l'extraction (EN17.2)

L'extraction de cette librairie dans un repo `pivot-design-system` dédié
(**publie `@pivot/design-system` sur npm/GitHub Packages**) se déclenche quand :

1. **`pivot-collaboratif-ui`** est créé (premier repo module) — il sera le premier
   consommateur externe du design system.
2. **Au moins 2 repos `pivot-xxx-ui`** ont besoin des mêmes composants/tokens.

Référence backlog : **EN17.2** (`pivot-docs/docs/backlog/EPIC-infra-multi-repo/ENABLERS/`)
— `Stage: Backlog`, `Phase: phase-3`.

## Storybook

Stories pour les 3 composants incubés et le token showcase :

```bash
npm run storybook   # dev server sur http://localhost:6006
npm run build-storybook   # build statique
```

## Build de la librairie

```bash
ng build design-system
```

Artefacts dans `dist/design-system/`.

## Tests

```bash
ng test design-system   # ou ng test --project=design-system
```
