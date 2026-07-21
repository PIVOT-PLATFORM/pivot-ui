import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach } from 'vitest';
import { ZoomControlsComponent } from './zoom-controls.component';

/**
 * Tests for the board's zoom control cluster (US08.11.2): a purely presentational component —
 * the canvas owns the arithmetic and the bounds, this component only renders `zoom`/`hasSelection`
 * and emits intent (`zoomIn`/`zoomOut`/`resetZoom`/`fitContent`/`fitSelection`).
 *
 * `fitBox`/`zoomAround`/`wheelZoom` (board-geometry.ts) are covered elsewhere — out of scope here.
 */

/** Real FR strings (from `projects/collaboratif-ui/i18n/fr.json`) so the readout's `{{percent}}`
 *  interpolation can actually be exercised — an empty-translation harness would just echo the key
 *  and skip interpolation entirely, which is the one thing this control's a11y contract hinges on. */
const FR_TRANSLATIONS = {
  whiteboard: {
    zoom: {
      group: 'Zoom',
      in: 'Zoom avant',
      out: 'Zoom arrière',
      reset: 'Zoom : {{percent}} % — réinitialiser à 100 %',
      fitContent: 'Ajuster au contenu',
      fitSelection: 'Ajuster à la sélection',
    },
  },
};

function byLabel(fixture: ComponentFixture<ZoomControlsComponent>, key: string): HTMLButtonElement {
  return fixture.nativeElement.querySelector(`[aria-label="${key}"]`) as HTMLButtonElement;
}

/**
 * Harness with empty translations, matching `FloatingToolbarComponent`'s spec convention: with no
 * translation loaded, Transloco's missing handler echoes the raw key (params included, ignored),
 * so buttons are located by their `aria-label` key rather than by translated text.
 */
function configureEmpty(): Promise<void> {
  return TestBed.configureTestingModule({
    imports: [
      ZoomControlsComponent,
      TranslocoTestingModule.forRoot({
        langs: { fr: {}, en: {} },
        translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        preloadLangs: true,
      }),
    ],
  }).compileComponents();
}

describe('ZoomControlsComponent — zoom percentage readout', () => {
  let fixture: ComponentFixture<ZoomControlsComponent>;

  function readoutText(): string {
    return (fixture.nativeElement.querySelector('.wb-zoom__readout span') as HTMLElement).textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    await configureEmpty();
    fixture = TestBed.createComponent(ZoomControlsComponent);
  });

  it('renders 1 as "100%"', () => {
    fixture.componentRef.setInput('zoom', 1);
    fixture.detectChanges();
    expect(readoutText()).toBe('100%');
  });

  it('renders 0.5 as "50%"', () => {
    fixture.componentRef.setInput('zoom', 0.5);
    fixture.detectChanges();
    expect(readoutText()).toBe('50%');
  });

  it('renders 1.5 as "150%"', () => {
    fixture.componentRef.setInput('zoom', 1.5);
    fixture.detectChanges();
    expect(readoutText()).toBe('150%');
  });

  // Rounded rather than truncated (documented in the component): 0.999 must read "100%", not
  // "99%" — the reset button must not look like it missed its own target.
  it('rounds 0.999 to "100%" instead of truncating to "99%"', () => {
    fixture.componentRef.setInput('zoom', 0.999);
    fixture.detectChanges();
    expect(readoutText()).toBe('100%');
  });
});

describe('ZoomControlsComponent — button outputs', () => {
  let fixture: ComponentFixture<ZoomControlsComponent>;
  let component: ZoomControlsComponent;

  beforeEach(async () => {
    await configureEmpty();
    fixture = TestBed.createComponent(ZoomControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('zoom', 1);
    fixture.detectChanges();
  });

  it('emits zoomOut when the "out" button is clicked', () => {
    let emitted = false;
    component.zoomOut.subscribe(() => (emitted = true));
    byLabel(fixture, 'whiteboard.zoom.out').click();
    expect(emitted).toBe(true);
  });

  it('emits zoomIn when the "in" button is clicked', () => {
    let emitted = false;
    component.zoomIn.subscribe(() => (emitted = true));
    byLabel(fixture, 'whiteboard.zoom.in').click();
    expect(emitted).toBe(true);
  });

  it('emits resetZoom when the readout is clicked', () => {
    let emitted = false;
    component.resetZoom.subscribe(() => (emitted = true));
    byLabel(fixture, 'whiteboard.zoom.reset').click();
    expect(emitted).toBe(true);
  });

  it('emits fitContent when the "fit to content" button is clicked', () => {
    let emitted = false;
    component.fitContent.subscribe(() => (emitted = true));
    byLabel(fixture, 'whiteboard.zoom.fitContent').click();
    expect(emitted).toBe(true);
  });

  it('emits fitSelection when the "fit to selection" button is clicked with a selection', () => {
    fixture.componentRef.setInput('hasSelection', true);
    fixture.detectChanges();
    let emitted = false;
    component.fitSelection.subscribe(() => (emitted = true));
    byLabel(fixture, 'whiteboard.zoom.fitSelection').click();
    expect(emitted).toBe(true);
  });
});

describe('ZoomControlsComponent — "fit to selection" gating', () => {
  let fixture: ComponentFixture<ZoomControlsComponent>;
  let component: ZoomControlsComponent;

  function fitSelectionButton(): HTMLButtonElement {
    return byLabel(fixture, 'whiteboard.zoom.fitSelection');
  }

  beforeEach(async () => {
    await configureEmpty();
    fixture = TestBed.createComponent(ZoomControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('zoom', 1);
  });

  it('marks the button aria-disabled and swallows the click when there is no selection', () => {
    fixture.componentRef.setInput('hasSelection', false);
    fixture.detectChanges();
    let emitted = false;
    component.fitSelection.subscribe(() => (emitted = true));

    expect(fitSelectionButton().getAttribute('aria-disabled')).toBe('true');
    fitSelectionButton().click();

    expect(emitted).toBe(false);
  });

  it('marks the button aria-disabled="false" and emits on click when something is selected', () => {
    fixture.componentRef.setInput('hasSelection', true);
    fixture.detectChanges();
    let emitted = false;
    component.fitSelection.subscribe(() => (emitted = true));

    expect(fitSelectionButton().getAttribute('aria-disabled')).toBe('false');
    fitSelectionButton().click();

    expect(emitted).toBe(true);
  });
});

describe('ZoomControlsComponent — accessibility', () => {
  let fixture: ComponentFixture<ZoomControlsComponent>;

  beforeEach(async () => {
    await configureEmpty();
    fixture = TestBed.createComponent(ZoomControlsComponent);
    fixture.componentRef.setInput('zoom', 1);
    fixture.detectChanges();
  });

  it('gives every button a non-empty aria-label', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('.wb-zoom button');

    expect(buttons.length).toBe(5);
    buttons.forEach((button: HTMLButtonElement) => {
      expect(button.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    });
  });

  it('groups the cluster under a labelled role="group"', () => {
    const group = fixture.nativeElement.querySelector('.wb-zoom');

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')?.length).toBeGreaterThan(0);
  });
});

describe('ZoomControlsComponent — readout announces the current percentage (real i18n)', () => {
  let fixture: ComponentFixture<ZoomControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ZoomControlsComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR_TRANSLATIONS },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ZoomControlsComponent);
  });

  it('interpolates the rounded percent into the reset button\'s aria-label', () => {
    fixture.componentRef.setInput('zoom', 0.5);
    fixture.detectChanges();

    const readout = fixture.nativeElement.querySelector('.wb-zoom__readout') as HTMLButtonElement;

    expect(readout.getAttribute('aria-label')).toContain('50');
  });

  it('updates the announced percentage when the zoom input changes', () => {
    fixture.componentRef.setInput('zoom', 1);
    fixture.detectChanges();
    const readout = fixture.nativeElement.querySelector('.wb-zoom__readout') as HTMLButtonElement;
    expect(readout.getAttribute('aria-label')).toContain('100');

    fixture.componentRef.setInput('zoom', 1.5);
    fixture.detectChanges();
    expect(readout.getAttribute('aria-label')).toContain('150');
  });
});
