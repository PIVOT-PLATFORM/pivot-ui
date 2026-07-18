# Vendored code — Spartan `brain` (headless behaviour/a11y)

Ce dossier contient du code **vendoré** (copié) depuis **Spartan** (`@spartan-ng/brain`),
la couche headless du design system Spartan, bâtie sur Angular CDK.

- **Source** : <https://github.com/spartan-ng/spartan> (`libs/brain`)
- **Licence** : MIT — Copyright (c) 2024 ROBIN GOETZ et les contributeurs Spartan
- **Version d'origine** : `@spartan-ng/brain` 1.1.0

## Périmètre vendoré

Seul le strict nécessaire à PIVOT est copié (cf. ADR-007 : brain uniquement, jamais la couche
visuelle `helm`/Tailwind) :

- `tooltip/` — comportement d'infobulle (positionnement CDK Overlay, délais, groupes, RTL, a11y),
  skinné par PIVOT via `pivot-ds` `[pivotTooltip]` (`src/components/tooltip`).
- `core/` — helpers partagés strictement requis (`injectSkipDelay`, `waitForElementAnimations`)
  + un type `ClassValue` local (remplace la dépendance de type `clsx`).

## Adaptations PIVOT (fidélité upstream sinon)

- Imports internes `@spartan-ng/brain/*` réécrits en relatif.
- `clsx` (import de type seulement) remplacé par un `ClassValue` local — zéro dépendance runtime.
- `wait-for-element-animations.ts` : `flatMap`/`Promise.allSettled` réécrits en équivalents
  compatibles avec le `lib` de compilation ng-packagr + annotations de type (nos gates sont plus
  stricts que ceux de Spartan). Comportement identique.

Ce code est **exclu** du lint/prettier/couverture (fidélité au fork amont) ; il est compilé par
ng-packagr via les composants PIVOT qui le consomment.
