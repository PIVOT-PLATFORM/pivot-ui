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
      <!--
        Le backdrop n'a pas d'équivalent clavier dédié par conception : c'est une
        commodité souris (clic à l'extérieur = annuler), pas un contrôle interactif à
        part entière. L'équivalent clavier existe déjà et est prioritaire — Escape
        (voir (keydown.escape) sur le conteneur de dialogue ci-dessous), conformément
        au WAI-ARIA Dialog (Modal) Pattern. Rendre ce calque focusable ajouterait un
        arrêt de tabulation fantôme sans libellé, ce qui dégraderait l'a11y réelle.
      -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div class="confirm-dialog__backdrop" data-testid="confirm-dialog-backdrop" (click)="cancel()">
        <!--
          (click) ici sert uniquement à stopPropagation (empêcher le clic dans le
          panneau de remonter jusqu'au backdrop et de fermer le dialogue). Le panneau
          n'est pas lui-même une cible interactive — le focus y est géré par
          FocusTrapFactory (premier élément focusable / bouton Annuler), pas par ce
          conteneur ; le rendre focusable ajouterait un arrêt de tabulation redondant.
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
