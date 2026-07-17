# CLAUDE.md — PIVOT-DESIGN-SYSTEM

## Projet

**PIVOT-DESIGN-SYSTEM** — Design system Angular de la suite PIVOT.

Stack : Angular CDK (comportement/a11y) + SCSS BEM custom (visuel) — ADR-007.  
Publie `@pivot-platform/design-system` sur npm (GitHub Packages).

**Ce que le design system exporte :**
- Composants Angular standalone exportés via `src/public-api.ts` — `IconComponent`, `FormFieldComponent`, `ButtonComponent`, `InputComponent`, `TextareaComponent`, `CheckboxComponent`, `RadioGroupComponent`, `SwitchComponent`, `SelectComponent`, `TooltipDirective`, `ConfirmDialogComponent`, `ToastComponent`, `PasswordStrengthComponent` + services `IconRegistry`, `ToastService`, `PasswordPolicyService` (selectors `pivot-ds-*`)
- SCSS tokens/reset/components — variables et styles globaux

## Communication

Concise et directe. Pas de récapitulatifs.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 22 · TypeScript |
| Comportement/A11y | Angular CDK |
| Styles | SCSS BEM custom |
| Build lib | ng-packagr |
| Documentation | Storybook 10 |
| CI/CD | GitHub Actions |

## Règles absolues

- Jamais de lib visuelle tierce (Material/PrimeNG/Taiga/Tailwind) — ADR-007 interdit explicitement
- Pas de `@Component` avec styles globaux — tout dans `src/scss/`
- Une entrée publique : `src/public-api.ts`
- Jamais de logique métier PIVOT dans ce repo — composants UI génériques uniquement
