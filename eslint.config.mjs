// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  // ─── EN53.4 — agilite-ui / collaboratif-ui (libs absorbées) — parité avec le lint de
  // leur repo d'origine (pivot-agilite-ui / pivot-collaboratif-ui) : uniquement les règles
  // TS de base (`eslint.configs.recommended` + `tseslint.configs.recommended` + ce bloc).
  // Ces repos n'utilisaient PAS @angular-eslint (ni règles TS ni règles template/a11y) — les
  // blocs `**/*.ts` et `**/*.html` ci-dessous les excluent donc explicitement (`ignores`)
  // pour ne pas leur appliquer des règles jamais tolérées à l'origine.
  {
    files: ['projects/agilite-ui/src/**/*.ts', 'projects/collaboratif-ui/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  // ─── #133 — @angular-eslint (TS) — mêmes règles que le tier "recommended" amont ──
  // Le paquet scopé @angular-eslint/eslint-plugin (contrairement au meta-paquet
  // `angular-eslint`) n'exporte pas de config flat prête à l'emploi : les règles sont
  // donc déclarées explicitement ici, alignées sur son propre tier "recommended"
  // (docs.recommended === 'recommended' pour chacune, vérifié dans le paquet installé).
  // `prefer-on-push-component-change-detection` couvre directement le cas #150
  // (OnPush manquant non détecté). Le processor extrait aussi les templates inline
  // (`template: \`...\`\``, ex. sidebar.component.ts, pages auth) pour qu'ils soient
  // lintés par le bloc @angular-eslint/template ci-dessous, pas seulement les .html.
  {
    files: ['**/*.ts'],
    ignores: ['projects/agilite-ui/**', 'projects/collaboratif-ui/**'],
    plugins: { '@angular-eslint': angular },
    processor: angularTemplate.processors['extract-inline-html'],
    rules: {
      '@angular-eslint/contextual-lifecycle': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-inputs-metadata-property': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/no-output-on-prefix': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/no-outputs-metadata-property': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/use-pipe-transform-interface': 'error',
    },
  },
  // ─── #133 — @angular-eslint/template — templates .html + templates inline ──
  // Règles "template" (tier recommended amont, docs.recommended === 'recommended'
  // dans le paquet installé — même méthode de vérification que le bloc TS ci-dessus)
  // + "accessibility" (WCAG 2.1 AA, cf. CLAUDE.md) + no-inline-styles (interdiction
  // des `style="..."`, cas #151). Contrairement au tier "recommended", le tier
  // "accessibility" n'est PAS taggé dans les métadonnées des règles du paquet
  // installé (pas de champ docs.recommended dédié) — la liste ci-dessous est donc
  // curée manuellement d'après le tier "accessibility" documenté en amont
  // (@angular-eslint/eslint-plugin-template), pas vérifiée automatiquement.
  {
    files: ['**/*.html'],
    ignores: ['projects/agilite-ui/**', 'projects/collaboratif-ui/**'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      // Tier "recommended" — correction de template
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      // Tier "accessibility" — WCAG 2.1 AA
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/mouse-events-have-key-events': 'error',
      '@angular-eslint/template/no-autofocus': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/role-has-required-aria': 'error',
      '@angular-eslint/template/table-scope': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      // Issue #133 — interdiction des styles inline dans les templates.
      // `allowBindToStyle: true` : la règle interdit TOUJOURS l'attribut `style="..."`
      // littéral (le bug réel #151 — 31 occurrences statiques dans les pages auth) mais
      // tolère les liaisons `[style.prop]` génuinement dynamiques (valeur calculée par
      // instance, ex. couleur d'avatar ou couleur de module configurée en admin) —
      // impossibles à exprimer en classe SCSS statique sans connaître la valeur au build.
      '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: true }],
    },
  },
  // ─── EN17.8 — Règle d'indépendance de la librairie design-system ────────────
  // La librairie ne doit importer AUCUN service applicatif (auth, tenant, i18n app).
  // Les imports autorisés : @angular/*, @jsverse/transloco, rxjs, @angular/cdk.
  {
    files: ['projects/design-system/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../app/*', '../../../app/*', '../../../../app/*', '**/app/core/**', '**/app/shared/**', '**/environments/**'],
              message: 'La lib design-system ne doit PAS importer de services applicatifs (app/core, app/shared, environments). Voir ADR-007 et EN17.8.',
            },
          ],
        },
      ],
    },
  },
  // ─── EN53.4 — design-system : fichiers Storybook (démo/doc, jamais publiés dans le
  // package npm — exclus de `ng-package.json`/`tsconfig.lib.json`) — parité avec le repo
  // d'origine (pivot-design-system), dont l'`eslint.config.js` n'inclut PAS la règle
  // `no-inline-styles` (ajout spécifique au shell pivot-ui, issue #133/#151, jamais
  // portée sur pivot-design-system). Les stories illustrent volontairement des styles de
  // démonstration inline — pas du code produit.
  // Note : le processor `extract-inline-html` (bloc @angular-eslint TS ci-dessus) linte les
  // templates inline sous un chemin virtuel `<fichier.ts>/<n>_inline-template-....component.html`
  // (ESLint `ProcessorService#preprocessSync` fait un `path.join(file.path, ...)` — le fichier
  // `.ts` d'origine devient un dossier virtuel, cf. eslint/lib/services/processor-service.js).
  // D'où un glob qui matche ce sous-chemin plutôt que le nom de fichier `.ts` réel.
  {
    files: [
      'projects/design-system/src/stories/**/*.component.html',
      'projects/design-system/.storybook/**/*.component.html',
    ],
    rules: {
      '@angular-eslint/template/no-inline-styles': 'off',
    },
  },
  {
    ignores: ['dist/**', '.angular/**', 'node_modules/**', 'coverage/**'],
  },
);
