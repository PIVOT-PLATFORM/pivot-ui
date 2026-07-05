import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
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

  it('renders role="dialog" when the role input is overridden (US02.2.3 sessions confirmation)', () => {
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
    // ngOnChanges (which drives focus management) only fires for inputs set through
    // Angular's binding mechanism — use componentRef.setInput() rather than direct
    // property assignment so the "open" change is actually observed.
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

  it('ignores non-open input changes (no-op branch in ngOnChanges)', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('title', 'Nouveau titre');
    fixture.detectChanges();
    // No error thrown and title updates normally — the "open" not in changes branch is a no-op.
    expect(component.title).toBe('Nouveau titre');
  });

  it('does nothing on Tab when the dialog has no focusable elements', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    // Remove focusable content temporarily to hit the "focusable.length === 0" guard.
    const actions = dialog.querySelector('.confirm-dialog__actions');
    actions.remove();
    expect(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))).not.toThrow();
  });

  it('wraps focus from the last focusable element to the first on Tab', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]');
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    confirmBtn.focus();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);

    expect(document.activeElement).toBe(cancelBtn);
  });

  it('wraps focus from the first focusable element to the last on Shift+Tab', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]');
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    cancelBtn.focus();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);

    expect(document.activeElement).toBe(confirmBtn);
  });

  it('does not move focus on Tab when focus is between the first and last elements', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const cancelBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]');
    cancelBtn.focus();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    // Only two focusable elements exist (cancel, confirm) — shift+tab from cancel (first)
    // wraps to confirm (last); a plain Tab from cancel should NOT be intercepted since
    // cancel is not the last element.
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);

    expect(document.activeElement).toBe(cancelBtn);
  });
});
