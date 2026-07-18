# @pivot-platform/design-system

Design system Angular de la suite PIVOT — Angular CDK (comportement/a11y) + SCSS BEM custom (visuel).

Stack actée par ADR-007 : aucune lib visuelle tierce (Material / PrimeNG / Taiga / Tailwind rejetés explicitement).

## Installation

```bash
npm install @pivot-platform/design-system --registry https://npm.pkg.github.com
```

Prérequis pairs (peerDependencies) :

```bash
npm install @angular/cdk @jsverse/transloco
```

## Composants disponibles

| Composant | Import |
|-----------|--------|
| `ConfirmDialogComponent` | `@pivot-platform/design-system` |
| `ToastComponent` | `@pivot-platform/design-system` |
| `ToastService` | `@pivot-platform/design-system` |
| `PasswordStrengthComponent` | `@pivot-platform/design-system` |
| `PasswordPolicyService` | `@pivot-platform/design-system` |

## Tokens SCSS

```scss
@use '@pivot-platform/design-system/scss/tokens';
@use '@pivot-platform/design-system/scss/reset';
@use '@pivot-platform/design-system/scss/components';
@use '@pivot-platform/design-system/scss/patterns';
```

Motifs `pv-*` (avatar, badge, dot, glyph, cartes, modale, tons sémantiques, glass…) :
voir [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — la référence complète.

## Storybook

Storybook publié (source de vérité visuelle) : **<https://pivot-platform.github.io/pivot-design-system/>**
— déployé automatiquement sur GitHub Pages à chaque push sur `main` (workflow
`deploy-storybook.yml`).

En local :

```bash
npm run storybook        # dev, port 6006
npm run build-storybook  # build statique dans storybook-static/
```

> Activation Pages (une seule fois) : le workflow active GitHub Pages en source
> « GitHub Actions » automatiquement au premier run (`configure-pages` avec `enablement: true`).
> Si les réglages de l'organisation le bloquent, l'activer manuellement dans
> Settings → Pages → Source : GitHub Actions.

## Build

```bash
npm run build   # produit dist/
```

## Publier une release

Les releases sont publiées automatiquement sur GitHub Packages via le workflow `publish.yml` au push d'un tag `v*`.

**Prérequis (une seule fois, admin organisation)** : créer un PAT GitHub avec scope `write:packages` et l'ajouter comme secret de repository sous le nom `NPM_TOKEN` (Settings → Secrets → Actions). Le `GITHUB_TOKEN` ne peut pas être utilisé car les write permissions de workflow sont désactivées au niveau de l'organisation.

```bash
git tag v0.2.0
git push origin v0.2.0
```

## Contribuer

Voir [CLAUDE.md](./CLAUDE.md) pour les conventions de développement.
