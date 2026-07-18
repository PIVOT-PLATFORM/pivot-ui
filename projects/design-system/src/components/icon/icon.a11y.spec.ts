/**
 * Tests d'accessibilité automatisés (axe-core) — IconComponent.
 *
 * Vérifie les deux postures : icône décorative (aria-hidden, sans nom accessible)
 * et icône signifiante (role="img" + aria-label). Fichier dédié `*.a11y.spec.ts`
 * pour éviter tout conflit avec le spec unitaire.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<IconComponent>;
  let component: IconComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconComponent] }).compileComponents();
    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  it('has no detectable axe violations when decorative (aria-hidden)', async () => {
    component.name = 'info';
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations when meaningful (role="img" + aria-label)', async () => {
    component.name = 'circle-check';
    component.label = 'Terminé';
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
