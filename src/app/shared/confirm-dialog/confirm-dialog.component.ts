/**
 * ConfirmDialogComponent — minimal, self-contained, accessible confirmation modal.
 *
 * No dialog library exists yet in pivot-ui and `@angular/cdk` is not a direct
 * dependency (verified in package.json — only `@angular/*` core packages,
 * Transloco, and rxjs). Rather than pull in a new dependency for a single use
 * case, this builds a small manual focus-trapped modal:
 * - Escape closes (calls `cancel()`)
 * - Focus moves to the cancel button on open, is trapped within the dialog
 *   via Tab/Shift+Tab, and returns to the element that triggered the dialog
 *   on close
 * - `role` defaults to `"alertdialog"` (destructive confirmation, e.g. the
 *   admin module deactivate flow) but is overridable via the `role` input —
 *   US02.2.3 (sessions revoke confirmation) requires `role="dialog"` per its
 *   AC — with `aria-modal="true"`, labelled/described via the title and message
 *
 * Kept in `shared/` since confirmation-before-destructive-action is a pattern
 * other features will likely need (not specific to module administration).
 *
 * US02.2.4 (account deletion) additions — both backward-compatible (defaults
 * preserve the original admin-modules usage untouched):
 * - `confirmDisabled` input: lets a multi-step caller (e.g. a password/OTP
 *   form) keep the destructive action disabled until its own input is valid.
 * - projected content (`<ng-content>`): lets a caller render step-specific
 *   body content (a data list, a form) inside the same accessible dialog
 *   shell instead of the single plain-text `message`.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'piv-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <!--
        Le backdrop n'a pas d'équivalent clavier dédié par conception : c'est une
        commodité souris (clic à l'extérieur = annuler), pas un contrôle interactif à
        part entière. L'équivalent clavier existe déjà et est prioritaire — Escape
        (voir onKeydown ci-dessous), conformément au WAI-ARIA Dialog (Modal) Pattern.
        Rendre ce calque focusable ajouterait un arrêt de tabulation fantôme sans
        libellé, ce qui dégraderait l'a11y réelle.
      -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="confirm-dialog__backdrop" data-testid="confirm-dialog-backdrop" (click)="cancel()">
        <!--
          (click) ici sert uniquement à stopPropagation (empêcher le clic dans le
          panneau de remonter jusqu'au backdrop et de fermer le dialogue). Le panneau
          n'est pas lui-même une cible interactive — le focus y est géré manuellement
          (voir ngOnChanges/trapFocus ci-dessous), pas par ce conteneur ; le rendre
          focusable ajouterait un arrêt de tabulation redondant.
        -->
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
        <div
          #dialogEl
          class="confirm-dialog"
          [attr.role]="role"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="messageId"
          data-testid="confirm-dialog"
          (click)="$event.stopPropagation()"
          (keydown)="onKeydown($event)"
        >
          <h2 [id]="titleId" class="confirm-dialog__title">{{ title }}</h2>
          <p [id]="messageId" class="confirm-dialog__message">{{ message }}</p>
          <ng-content></ng-content>
          <div class="confirm-dialog__actions">
            <button
              #cancelBtn
              type="button"
              class="btn btn-secondary"
              data-testid="confirm-dialog-cancel"
              (click)="cancel()"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="btn btn-danger"
              data-testid="confirm-dialog-confirm"
              [disabled]="confirmDisabled"
              (click)="confirm()"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent implements OnChanges {
  private static idCounter = 0;

  @Input() open = false;
  /** ARIA role of the dialog element. `alertdialog` (default) for destructive confirmations, `dialog` where the AC mandates it explicitly (e.g. US02.2.3). */
  @Input() role: 'dialog' | 'alertdialog' = 'alertdialog';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = '';
  @Input() cancelLabel = '';
  /** Disables the confirm button (e.g. an in-dialog form is invalid or a request is in flight). */
  @Input() confirmDisabled = false;

  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  @ViewChild('dialogEl') private readonly dialogEl?: ElementRef<HTMLElement>;
  @ViewChild('cancelBtn') private readonly cancelBtn?: ElementRef<HTMLButtonElement>;

  protected readonly titleId = `confirm-dialog-title-${++ConfirmDialogComponent.idCounter}`;
  protected readonly messageId = `confirm-dialog-message-${ConfirmDialogComponent.idCounter}`;

  private previouslyFocused: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      // Wait for the dialog to render before moving focus into it.
      queueMicrotask(() => this.cancelBtn?.nativeElement.focus());
    } else {
      this.previouslyFocused?.focus();
      this.previouslyFocused = null;
    }
  }

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const dialog = this.dialogEl?.nativeElement;
    if (!dialog) {
      return;
    }
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
