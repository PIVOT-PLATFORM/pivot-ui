/*
 * Public API Surface of @pivot/design-system
 *
 * EN17.8 — incubation du design system dans pivot-ui workspace.
 * Structure ADR-007 : tokens/ · cdk/ · components/ · scss/
 *
 * Point d'entrée unique — exporter uniquement ce qui est stable et documenté.
 */

// ─── Components ──────────────────────────────────────────────────────────────
// EN17.13 (Vague 0) — fondations : icône SVG inline + registre, enveloppe de champ.
export * from './components/icon/icon-registry';
export * from './components/icon/icon.component';
export * from './components/form-field/form-field.component';
// EN17.14 (Vague 1) — socle formulaires.
export * from './components/button/button.component';
export * from './components/input/input.component';
export * from './components/textarea/textarea.component';
export * from './components/checkbox/checkbox.component';
export * from './components/radio-group/radio-group.component';
export * from './components/switch/switch.component';
export * from './components/select/select.component';
// EN17.15 (Vague 2) — tooltip : skin PIVOT du brain Spartan vendoré (src/vendor/spartan-brain).
// BrnTooltip réexporté car ng-packagr l'exige (composé en hostDirective par TooltipDirective).
export { BrnTooltip } from './vendor/spartan-brain/tooltip';
export * from './components/tooltip/tooltip.directive';
export * from './components/confirm-dialog/confirm-dialog.component';
export * from './components/toast/toast.service';
export * from './components/toast/toast.component';
export * from './components/password-strength/password-policy.service';
export * from './components/password-strength/password-strength.component';
