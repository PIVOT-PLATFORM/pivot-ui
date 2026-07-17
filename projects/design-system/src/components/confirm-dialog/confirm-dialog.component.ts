/**
 * ConfirmDialogComponent — accessible confirmation modal using @angular/cdk Overlay + FocusTrap.
 *
 * EN17.8: First CDK behaviour/a11y brick in the design system library.
 * Migrated from src/app/shared/confirm-dialog to use CDK:
 * - FocusTrapFactory traps Tab/Shift+Tab within the dialog
 * - Escape closes (calls cancel())
 * - Focus returns to the triggering element on close
 * - role defaults to "alertdialog" (destructive), overridable to "dialog" (US02.2.3)
 * - aria-modal + aria-labelledby + aria-describedby
 *
 * The app's src/app/shared/confirm-dialog/ is kept for backward compat —
 * consumers will switch to this lib version when @pivot/design-system is published (EN17.2).
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

@Component({
  selector: 'pivot-ds-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div
        class="confirm-dialog__backdrop"
        data-testid="confirm-dialog-backdrop"
        role="button"
        tabindex="0"
        [attr.aria-label]="cancelLabel"
        (click)="cancel()"
        (keydown.enter)="cancel()"
        (keydown.space)="cancel()"
      >
        <div
          #dialogEl
          class="confirm-dialog"
          [attr.role]="role"
          aria-modal="true"
          tabindex="-1"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="messageId"
          data-testid="confirm-dialog"
          (click)="$event.stopPropagation()"
          (keydown.escape)="cancel()"
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
export class ConfirmDialogComponent implements OnChanges, OnDestroy {
  private static idCounter = 0;

  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private focusTrap?: FocusTrap;

  @Input() open = false;
  /** ARIA role. `alertdialog` (default) for destructive confirmations, `dialog` for non-destructive (e.g. US02.2.3). */
  @Input() role: 'dialog' | 'alertdialog' = 'alertdialog';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = '';
  @Input() cancelLabel = '';
  /** Disables the confirm button (e.g. in-dialog form is invalid or request in flight). */
  @Input() confirmDisabled = false;

  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  @ViewChild('dialogEl') private readonly dialogEl?: ElementRef<HTMLElement>;
  @ViewChild('cancelBtn') private readonly cancelBtn?: ElementRef<HTMLButtonElement>;

  protected readonly titleId = `pivot-ds-dialog-title-${++ConfirmDialogComponent.idCounter}`;
  protected readonly messageId = `pivot-ds-dialog-message-${ConfirmDialogComponent.idCounter}`;

  private previouslyFocused: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      queueMicrotask(() => {
        if (this.dialogEl?.nativeElement) {
          this.focusTrap = this.focusTrapFactory.create(this.dialogEl.nativeElement);
          this.focusTrap.focusInitialElement();
        }
        // Fallback: focus cancel button if CDK finds no initial-focus element
        this.cancelBtn?.nativeElement.focus();
      });
    } else {
      this.destroyFocusTrap();
      this.previouslyFocused?.focus();
      this.previouslyFocused = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyFocusTrap();
  }

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private destroyFocusTrap(): void {
    this.focusTrap?.destroy();
    this.focusTrap = undefined;
  }
}
