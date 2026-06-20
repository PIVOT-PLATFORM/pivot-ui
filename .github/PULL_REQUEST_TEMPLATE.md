## US liée

Closes #

## Description

<!-- Résumé des changements -->

## Type de changement

- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `security` — **hard block : review humaine obligatoire**
- [ ] `breaking-change` — **hard block : review humaine obligatoire**
- [ ] `refactor` — refactoring sans changement de comportement
- [ ] `chore` — maintenance, CI, dépendances
- [ ] `docs` — documentation
- [ ] `style` — SCSS, tokens, design system

## Couverture des AC

| Critère d'acceptation | Test(s) associé(s) |
|-----------------------|--------------------|
| Given … when … then … | `describe > it('AC-XX-YY: ...')` |
| Error case : … | `describe > it('AC-XX-YY: error case...')` |
| Security : … | `describe > it('AC-XX-YY: security...')` |
| A11y : … | `describe > it('AC-XX-YY: a11y...')` |

## Gate de confiance

- Gate 1 READINESS : `docs/gates/us-{id}/gate-1.yaml`
- Gate 2 COVERAGE (dernier commit) : `docs/gates/us-{id}/gate-2-{sha}.yaml`
- Gate 3 QUALITY (après CI) : `docs/gates/us-{id}/gate-3.yaml`
- Gate 4 score : ___/100

## Checklist

- [ ] Tous les AC couverts par des tests Vitest
- [ ] ESLint + TypeScript strict clean (0 warning)
- [ ] Aucun secret dans le code
- [ ] Attributs ARIA + focus visible sur éléments interactifs (WCAG 2.1 AA)
- [ ] Spec Playwright ajoutée / mise à jour (happy path + 1 erreur critique)
- [ ] Statut GitHub Issues mis à jour → "Review"
- [ ] Artifact Gate 2 committé dans `docs/gates/`
- [ ] Build Angular production réussi (`npm run build -- --configuration production`)
