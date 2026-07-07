import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    <pivot-ds-confirm-dialog [open]="true" title="t" message="m" confirmLabel="c" cancelLabel="a">
      <p data-testid="projected-body">Corps projeté (US02.2.4 — étape mot de passe/OTP)</p>
    </pivot-ds-confirm-dialog>
  `,
})
class ProjectionHostComponent {}

describe('ConfirmDialogComponent (design-system lib)', () => {
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

  it('renders nothing when closed', () => {
    component.open = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('renders the dialog with role="alertdialog" (default) and aria-modal when open', () => {
    component.open = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders role="dialog" when the role input is overridden', () => {
    component.role = 'dialog';
    component.open = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog.getAttribute('role')).toBe('dialog');
  });

  it('displays the title and message', () => {
    component.open = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Désactiver whiteboard ?');
    expect(fixture.nativeElement.textContent).toContain('Les utilisateurs connectés seront bloqués. Confirmer ?');
  });

  it('emits confirmed when the confirm button is clicked', () => {
    component.open = true;
    fixture.detectChanges();
    let confirmed = false;
    component.confirmed.subscribe(() => (confirmed = true));
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    expect(confirmed).toBe(true);
  });

  it('emits cancelled when the cancel button is clicked', () => {
    component.open = true;
    fixture.detectChanges();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    expect(cancelled).toBe(true);
  });

  it('emits cancelled when the backdrop is clicked', () => {
    component.open = true;
    fixture.detectChanges();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-backdrop"]').click();
    expect(cancelled).toBe(true);
  });

  it('does not cancel when clicking inside the dialog body', () => {
    component.open = true;
    fixture.detectChanges();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]').click();
    expect(cancelled).toBe(false);
  });

  it('emits cancelled on Escape keydown', () => {
    component.open = true;
    fixture.detectChanges();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toBe(true);
  });

  it('moves focus to the cancel button when opened', async () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await Promise.resolve();
    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]');
    expect(document.activeElement).toBe(cancelBtn);
  });

  it('restores focus to the previously focused element when closed', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await Promise.resolve();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('ignores non-open input changes', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('title', 'Nouveau titre');
    fixture.detectChanges();
    expect(component.title).toBe('Nouveau titre');
  });

  it('disables the confirm button when confirmDisabled is true', () => {
    component.open = true;
    component.confirmDisabled = true;
    fixture.detectChanges();
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    expect(confirmBtn.disabled).toBe(true);
  });

  it('enables the confirm button by default', () => {
    component.open = true;
    fixture.detectChanges();
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    expect(confirmBtn.disabled).toBe(false);
  });

  it('projects caller content inside the dialog (US02.2.4)', async () => {
    const hostFixture = TestBed.createComponent(ProjectionHostComponent);
    hostFixture.detectChanges();
    expect(hostFixture.nativeElement.querySelector('[data-testid="projected-body"]')).not.toBeNull();
  });
});
