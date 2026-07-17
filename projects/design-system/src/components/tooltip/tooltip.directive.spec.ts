import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, runInInjectionContext } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TooltipDirective } from './tooltip.directive';
import { BrnTooltip, injectBrnTooltipDefaultOptions } from '../../vendor/spartan-brain/tooltip';

@Component({
  selector: 'ds-tooltip-host',
  standalone: true,
  imports: [TooltipDirective],
  template: `<button [pivotDsTooltip]="text" position="right">?</button>`,
})
class HostComponent {
  text = 'Aide contextuelle';
}

describe('TooltipDirective (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('applies the PivotTooltip directive on the host element', () => {
    const de = fixture.debugElement.query(By.directive(TooltipDirective));
    expect(de).not.toBeNull();
  });

  it('composes the vendored Spartan brain (BrnTooltip host directive) and forwards the branded input', () => {
    const de = fixture.debugElement.query(By.directive(TooltipDirective));
    const brn = de.injector.get(BrnTooltip);
    expect(brn).toBeTruthy();
    // `[pivotDsTooltip]` is aliased onto BrnTooltip's `brnTooltip` input.
    expect(brn.brnTooltip()).toBe('Aide contextuelle');
    expect(brn.position()).toBe('right');
  });

  it('skins the tooltip content with PIVOT token classes (pv-tooltip)', () => {
    const de = fixture.debugElement.query(By.directive(TooltipDirective));
    const options = runInInjectionContext(de.injector, () => injectBrnTooltipDefaultOptions());
    expect(options.tooltipContentClasses).toBe('pv-tooltip');
    expect(options.arrowClasses('top')).toBe('pv-tooltip__arrow');
    expect(options.svgClasses).toBe('pv-tooltip__svg');
  });
});
