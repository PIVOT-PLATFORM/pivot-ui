import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { BoardService } from '../../core/whiteboard/board.service';
import { BoardPreview } from '../../core/whiteboard/board.model';

/** A rectangle ready to draw in the preview SVG's board-coordinate space. */
interface PreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

/** Fallback fills when a card carries no usable colour (e.g. IMAGE cards are `transparent`). */
const CARD_FALLBACK = '#cbd5e1';
const FRAME_FALLBACK = '#94a3b8';
/** Padding (board units) around the content bounding box so nothing touches the edge. */
const VIEWBOX_PAD = 24;

/**
 * Mini-thumbnail of a board's canvas for the board-list card. Lazily fetches the board's
 * lightweight geometry (`GET /whiteboard/boards/{id}/preview` — cards + frames, no content) the
 * first time the card scrolls into view, then renders it as a scaled SVG of coloured rectangles.
 * While loading, empty, or on error it shows the same gradient placeholder the list used before,
 * so a board with no content (or an unreachable preview) degrades gracefully.
 */
@Component({
  selector: 'app-board-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-preview.component.html',
  styleUrl: './board-preview.component.scss',
})
export class BoardPreviewComponent implements OnInit, OnDestroy {
  readonly boardId = input.required<string>();

  protected readonly status = signal<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  protected readonly viewBox = signal('0 0 240 140');
  protected readonly frames = signal<PreviewRect[]>([]);
  protected readonly cards = signal<PreviewRect[]>([]);

  private readonly boardService = inject(BoardService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    // IntersectionObserver keeps a 20-board page from firing 20 requests at once: each preview
    // only fetches when its card is actually scrolled into view. Where it is unavailable
    // (very old browsers, or a bare test environment) the preview simply stays on its
    // placeholder rather than eagerly loading — a graceful, request-free degradation.
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this.observer?.disconnect();
        this.load();
      }
    });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private load(): void {
    this.status.set('loading');
    this.boardService.getBoardPreview(this.boardId()).subscribe({
      next: (preview) => this.render(preview),
      error: () => this.status.set('error'),
    });
  }

  private render(preview: BoardPreview): void {
    const frames = preview.frames ?? [];
    const cards = preview.cards ?? [];
    if (frames.length === 0 && cards.length === 0) {
      this.status.set('empty');
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of [...frames, ...cards]) {
      minX = Math.min(minX, r.posX);
      minY = Math.min(minY, r.posY);
      maxX = Math.max(maxX, r.posX + r.width);
      maxY = Math.max(maxY, r.posY + r.height);
    }
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    this.viewBox.set(`${minX - VIEWBOX_PAD} ${minY - VIEWBOX_PAD} ${w + VIEWBOX_PAD * 2} ${h + VIEWBOX_PAD * 2}`);

    this.frames.set(
      frames.map((f) => ({ x: f.posX, y: f.posY, w: f.width, h: f.height, color: usable(f.color, FRAME_FALLBACK) })),
    );
    this.cards.set(
      cards.map((c) => ({ x: c.posX, y: c.posY, w: c.width, h: c.height, color: usable(c.color, CARD_FALLBACK) })),
    );
    this.status.set('ready');
  }
}

/** A colour is usable if it is a non-empty, non-`transparent` value; otherwise fall back. */
function usable(color: string | null | undefined, fallback: string): string {
  return color && color !== 'transparent' ? color : fallback;
}
