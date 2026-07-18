# PIVOT Design System — référence

Source unique du langage visuel PIVOT (charte v3 : violet/magenta duotone, coins
quasi-droits, Fira, dark mode piloté par tokens). Consommée par le shell **et** les
modules (pilotage, agilité, collaboratif) via des **classes globales** — un composant
pose la classe dans son template, sans redéclarer de SCSS.

Package `@pivot-platform/design-system`. Fichiers SCSS (`src/scss/`) importables via sous-chemin :
`scss/tokens` (variables), `scss/reset`, `scss/components` (`.btn`, `.card`, `.form-*`, `.alert`,
`.spinner`…), `scss/patterns` (motifs `pv-*`). Le shell `pivot-ui` les charge globalement (aujourd'hui
via un shim local `projects/design-system/` en attendant la consommation du package publié — gap EN17.2).

> **Règle d'or** : ne jamais hardcoder une couleur/une taille de motif dans un composant.
> Utiliser un token (`var(--color-*)`) ou une classe de motif ci-dessous. Les couleurs
> Google/Material (`#0b5fff`, `#5f6368`…) sont proscrites.

---

## 1. Tokens (`tokens.scss`)

| Groupe | Variables | Notes |
|---|---|---|
| Marque | `--color-brand-50…950` | Violet primaire (ramp complète, light + dark) |
| Accent | `--color-accent`, `--color-accent-50…950` | Magenta (surlignage, jamais en aplat de grande surface) |
| Neutres | `--color-gray-50…900` | Gris teintés violet |
| Sémantique | `--color-{success,warning,error,info}` (+ `-light/-dark/-border/-400`) | États |
| Surfaces | `--surface-bg`, `--surface-card`, `--surface-navbar`, `--surface-sidebar` | |
| Glass (auth) | `--auth-gradient`, `--glass-bg`, `--glass-border`, `--glass-shadow(-strong)` | Pages connexion/inscription |
| Typo | `--font-sans` (Fira Sans), `--font-mono` (Fira Mono), `--text-xs…2xl` | |
| Rayons | `--radius-sm/md/lg/xl` (2–3px) | Charte « net et carré » |
| Ombres | `--shadow-sm/md/lg/xl` | |
| Transitions | `--transition-fast` (150ms), `--transition-base` (200ms) | |

Dark mode : `[data-theme="dark"]` redéclare les tokens — les motifs suivent automatiquement.

---

## 2. Tons sémantiques — `.pv-tone-*`

**Source unique de la couleur d'état.** Chaque ton pose 3 variables consommées par les
motifs `pv-badge` / `pv-glyph` / `pv-dot` / `pv-avatar` : `--pv-tone-bg` (fond doux),
`--pv-tone-fg` (texte/icône), `--pv-tone-solid` (aplat plein).

`pv-tone-brand` · `pv-tone-accent` · `pv-tone-success` · `pv-tone-warning` ·
`pv-tone-danger` · `pv-tone-info` · `pv-tone-neutral`

On **combine** une classe de motif + une classe de ton — on ne redéclare jamais un couple
bg/couleur :

```html
<span class="pv-badge pv-tone-success">Fait</span>
<span class="pv-glyph pv-tone-info">S</span>
<span class="pv-dot pv-tone-danger"></span>
<span class="pv-avatar pv-tone-brand">MC</span>
```

---

## 3. Motifs (`patterns.scss`)

| Classe | Rôle | Variantes |
|---|---|---|
| `pv-page-header` | En-tête de page (icône + titre + sous-titre + actions) | `__title`, `__icon`, `__subtitle`, `__actions` |
| `pv-card` | Carte de surface | `--interactive` (survol « lift ») |
| `pv-card-grid` | Grille de cartes responsive (`minmax(300px,1fr)`) | |
| `pv-icon-tile` | Pastille d'icône dégradé de marque | |
| `pv-badge` | Pilule d'état (ton) | `--square` (coins droits), `--fixed` (largeur fixe) |
| `pv-dot` | Pastille pleine (ton `--solid`) | `--sm`, `--lg` |
| `pv-avatar` | Initiales dans un rond (ton, défaut brand) | `--xs/--sm/--lg`, `--solid` (fond plein, texte blanc) |
| `pv-glyph` | Badge carré à lettre/icône (ton) | `--sm`, `--lg` |
| `pv-chip` | Puce (membre, tag, filtre) | |
| `pv-segmented` | Toggle segmenté | `__option`, `__option--active` |
| `pv-stat-card` | Carte KPI (label + valeur) | `--accent`, `__label/__value/__hint` |
| `pv-empty-state` | État vide centré | `__icon/__title/__text` |
| `pv-add-tile` | Bouton « ajouter » en pointillés | |
| `pv-skeleton` | Squelette de chargement (respecte `prefers-reduced-motion`) | |
| `pv-modal-overlay` + `pv-modal` | Modale (overlay + panneau 3 zones) | `__header/__title/__body/__footer` |
| `pv-glass-card` + `pv-glass-input` | Carte + champs translucides (pages auth) | Sur `--auth-gradient` uniquement |

### Tailles canoniques (fin de la divergence)
- **Avatar** : md 28px (défaut) · sm 24px · xs 22px · lg 40px.
- **Glyph** : md 32px (défaut) · sm 28px · lg 36px.
- **Dot** : 8px (défaut) · sm 7px · lg 10px.

---

## 4. Adoption — état

| Surface | Statut |
|---|---|
| `teams-admin` (shell) | ✅ `pv-avatar` / `pv-badge` / `pv-tone-*` / overlay |
| `agilite-hub` (agilité) | ✅ `pv-avatar` / `pv-badge` / `pv-dot` + tons |
| `gantt-chart` (pilotage) | ✅ `pv-avatar` |
| `activities-panel` (collaboratif) | ✅ `pv-glyph` + tons |
| Pages auth (connexion/inscription) | Glass canonique dispo (`pv-glass-card`/`pv-glass-input`) ; l'impl. reste en SCSS composant — adoption à finaliser |

Les modules consomment ces classes **au runtime** via le CSS global du shell (le paquet
`@pivot/design-system` n'est pas encore publié — cf. CLAUDE.md). Migration = remplacer les
classes inline du template par les `pv-*` et supprimer le SCSS dupliqué du composant.
