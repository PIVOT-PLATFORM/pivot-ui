import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProblemDetailResponse, SessionResponse, WordEntry } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

const MAX_WORD_LENGTH = 30;

/** Font-size steps (rem) the cloud interpolates across, from least to most frequent. */
const MIN_FONT_REM = 1;
const MAX_FONT_REM = 3;

/**
 * WORDCLOUD activity participant view (US19.3.3) — a submission box plus a **CSS-only** word
 * cloud (font size proportional to frequency, computed client-side, ADR-007: no charting/cloud
 * third-party library). Rendering uses native text interpolation (`{{ }}`), never `innerHTML`,
 * so a submitted word can't be interpreted as markup regardless of backend escaping.
 */
@Component({
  selector: 'app-session-activity-wordcloud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-wordcloud.component.html',
  styleUrl: './session-activity-wordcloud.component.scss',
})
export class SessionActivityWordcloudComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<SessionResponse>();
  readonly disabled = input(false);

  readonly word = signal('');
  readonly words = signal<WordEntry[]>([]);
  readonly submitting = signal(false);
  readonly errorMessageKey = signal<string | null>(null);

  private readonly maxFrequency = computed(() =>
    Math.max(1, ...this.words().map(w => w.frequency)),
  );

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  /** Font size (rem) for a word, linearly interpolated by its frequency share of the max. */
  fontSizeFor(entry: WordEntry): string {
    const ratio = entry.frequency / this.maxFrequency();
    return `${MIN_FONT_REM + ratio * (MAX_FONT_REM - MIN_FONT_REM)}rem`;
  }

  submit(): void {
    const trimmed = this.word().trim();
    if (this.disabled() || this.submitting() || trimmed.length === 0 || trimmed.length > MAX_WORD_LENGTH) {
      return;
    }
    this.submitting.set(true);
    this.errorMessageKey.set(null);
    this.sessionApi.submitWord(this.session().id, { word: trimmed }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.word.set('');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessageKey.set(this.resolveErrorKey(error));
      },
    });
  }

  private resolveErrorKey(error: HttpErrorResponse): string {
    if (error.status === 400) {
      const body = error.error as ProblemDetailResponse | null;
      if (body?.code === 'WORD_BLOCKED') {
        return 'session.wordcloud.errors.blocked';
      }
      return 'session.wordcloud.errors.invalid';
    }
    if (error.status === 409) {
      const body = error.error as ProblemDetailResponse | null;
      if (body?.code === 'WORD_LIMIT_REACHED') {
        return 'session.wordcloud.errors.limitReached';
      }
      return 'session.wordcloud.errors.invalidStatus';
    }
    return 'session.wordcloud.errors.generic';
  }

  private onMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }
    const type = (parsed as { type?: string }).type;
    if (type === 'WORD_ADDED') {
      const event = parsed as { entry: WordEntry };
      this.words.update(current => {
        const existing = current.find(w => w.word === event.entry.word);
        if (existing) {
          return current.map(w => (w.word === event.entry.word ? { ...w, frequency: event.entry.frequency } : w));
        }
        return [...current, event.entry];
      });
    } else if (type === 'WORD_REMOVED') {
      const event = parsed as { word: string };
      this.words.update(current => current.filter(w => w.word !== event.word));
    }
  }
}
