// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

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
  {
    ignores: ['dist/**', '.angular/**', 'node_modules/**', 'coverage/**'],
  },
);
