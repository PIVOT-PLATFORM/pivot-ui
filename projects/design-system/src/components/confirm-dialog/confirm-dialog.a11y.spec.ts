/**
 * Tests d'accessibilité automatisés (axe-core) — ConfirmDialogComponent.
 *
 * Complète les assertions ARIA manuelles du spec unitaire par une passe axe
 * complète sur le DOM rendu, en état *ouvert* (le composant ne rend rien fermé).
 *
 * Nouveau fichier dédié (`*.a11y.spec.ts`) pour éviter tout conflit avec les
 * specs existants — cf. tâche EN a11y axe.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    component.title = 'Désactiver whiteboard ?';
    component.message = 'Les utilisateurs connectés seront bloqués. Confirmer ?';
    component.confirmLabel = 'Désactiver';
    component.cancelLabel = 'Annuler';
  });

  it('has no detectable axe violations when open (role="alertdialog")', async () => {
    component.open = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).not.toBeNull();
    expect(await axe(dialog as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations when open with role="dialog"', async () => {
    component.role = 'dialog';
    component.open = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(await axe(dialog as HTMLElement)).toHaveNoViolations();
  });
});
