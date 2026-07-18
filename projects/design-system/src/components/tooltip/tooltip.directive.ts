import { Directive } from '@angular/core';
import { BrnTooltip } from '../../vendor/spartan-brain/tooltip';
import { provideBrnTooltipDefaultOptions } from '../../vendor/spartan-brain/tooltip';

/**
 * `[pivotDsTooltip]` — infobulle du design system PIVOT.
 *
 * EN17.15 (Vague 2). **Skin PIVOT** du comportement headless de Spartan brain (vendoré dans
 * `src/vendor/spartan-brain`, licence MIT — cf. `NOTICE.md`) : positionnement CDK Overlay,
 * délais show/hide, groupes, RTL, animations et a11y (`aria-describedby` posé sur le déclencheur)
 * sont fournis par `BrnTooltip`, composé ici en `hostDirective`. La directive n'ajoute que
 * l'habillage : les classes de contenu `pv-tooltip*` (motif SCSS tokenisé, rendu dans l'overlay).
 *
 * @example
 * ```html
 * <button [pivotDsTooltip]="'account.help' | transloco">?</button>
 * <button [pivotDsTooltip]="tpl" position="right"><ng-template #tpl>…</ng-template></button>
 * ```
 */
@Directive({
  selector: '[pivotDsTooltip]',
  standalone: true,
  hostDirectives: [
    {
      directive: BrnTooltip,
      inputs: [
        'brnTooltip: pivotDsTooltip',
        'position',
        'showDelay',
        'hideDelay',
        'tooltipDisabled: pivotDsTooltipDisabled',
      ],
      outputs: ['show', 'hide'],
    },
  ],
  providers: [
    provideBrnTooltipDefaultOptions({
      tooltipContentClasses: 'pv-tooltip',
      arrowClasses: () => 'pv-tooltip__arrow',
      svgClasses: 'pv-tooltip__svg',
    }),
  ],
})
export class TooltipDirective {}
