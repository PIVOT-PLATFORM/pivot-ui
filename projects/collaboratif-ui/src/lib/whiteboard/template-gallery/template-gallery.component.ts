import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TemplateService } from '../../core/whiteboard/template.service';
import { WhiteboardTemplate } from '../../core/whiteboard/board.model';

/**
 * Template gallery embedded in the "Nouveau tableau" modal (US08.4.1).
 *
 * Fetches the global template catalog (`GET /whiteboard/templates`) and renders it as a
 * single-select `listbox` of cards (name, visual preview, description) preceded by an
 * explicit "Aucun template" (blank) card. The blank card is the default selection once
 * loading settles — the user must actively pick a template to move away from it — and
 * emits `null`, meaning the parent falls back to blank ("Vierge") board creation.
 *
 * Keyboard support: arrow keys move focus between cards (roving tabindex), Enter/Space
 * select the focused card (native `<button>` activation). The blank card occupies index
 * `0` of the unified keyboard index space; template cards occupy `i + 1`.
 */
@Component({
  selector: 'app-template-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './template-gallery.component.html',
  styleUrl: './template-gallery.component.scss',
})
export class TemplateGalleryComponent implements OnInit {
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly templates = signal<WhiteboardTemplate[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly skeletons = Array.from<null>({ length: 3 });

  /** Emits the selected template id, or `null` for a blank ("Vierge") creation. */
  readonly selectionChange = output<string | null>();

  private readonly templateService = inject(TemplateService);
  private readonly transloco = inject(TranslocoService);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  ngOnInit(): void {
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected select(templateId: string): void {
    this.selectedId.set(templateId);
    this.selectionChange.emit(templateId);
  }

  /** Selects the "Aucun template" card — emits `null` for a blank ("Vierge") board. */
  protected selectBlank(): void {
    this.selectedId.set(null);
    this.selectionChange.emit(null);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    // Unified index space: 0 = blank card, i + 1 = templates()[i].
    const count = this.templates().length + 1;

    if (event.key === 'Enter' || event.key === ' ') {
      // Explicit handling (rather than relying on native button activation) keeps
      // selection behavior deterministic across browsers and test environments.
      event.preventDefault();
      this.selectByIndex(index);
      return;
    }

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + count) % count;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusCardAt(nextIndex);
  }

  protected optionTabIndex(key: string | null): number {
    return this.selectedId() === key ? 0 : -1;
  }

  private selectByIndex(index: number): void {
    if (index === 0) {
      this.selectBlank();
      return;
    }
    this.select(this.templates()[index - 1].id);
  }

  protected templateName(code: WhiteboardTemplate['code']): string {
    return this.transloco.translate(`whiteboard.template.${this.slugify(code)}.name`);
  }

  protected templateDescription(code: WhiteboardTemplate['code']): string {
    return this.transloco.translate(`whiteboard.template.${this.slugify(code)}.description`);
  }

  protected previewAlt(code: WhiteboardTemplate['code']): string {
    return this.transloco.translate('whiteboard.template.previewAlt', {
      name: this.templateName(code),
    });
  }

  private load(): void {
    this.status.set('loading');
    this.templateService.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.status.set('loaded');
        // Blank ("Aucun template") is the default selection — the user opts into a template.
        this.selectBlank();
      },
      error: () => {
        this.status.set('error');
        this.selectBlank();
      },
    });
  }

  private focusCardAt(index: number): void {
    const cards = this.elementRef.nativeElement.querySelectorAll<HTMLButtonElement>(
      '.template-gallery__card',
    );
    cards[index]?.focus();
  }

  private slugify(code: string): string {
    return code.toLowerCase().replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());
  }
}
