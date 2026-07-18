/**
 * Tests d'accessibilité automatisés (axe-core) — TooltipDirective (déclencheur).
 *
 * Le contenu de l'infobulle est rendu dans l'overlay CDK à l'affichage (comportement + ARIA
 * `aria-describedby` fournis par le brain Spartan vendoré, testés en amont). Ici on vérifie que
 * le **déclencheur** ne présente aucune violation.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { TooltipDirective } from './tooltip.directive';

@Component({
  selector: 'ds-tooltip-a11y-host',
  standalone: true,
  imports: [TooltipDirective],
  template: `<button type="button" [pivotDsTooltip]="'Aide contextuelle'" aria-label="Aide">
    ?
  </button>`,
})
class TooltipA11yHost {}

describe('TooltipDirective — a11y (axe)', () => {
  let fixture: ComponentFixture<TooltipA11yHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TooltipA11yHost] }).compileComponents();
    fixture = TestBed.createComponent(TooltipA11yHost);
  });

  it('has no detectable axe violations on the trigger', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
