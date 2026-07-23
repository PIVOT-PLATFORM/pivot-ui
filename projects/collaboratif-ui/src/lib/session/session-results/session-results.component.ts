import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import {
  BrainstormCard,
  LeaderboardEntry,
  PollOptionResult,
  QaQuestion,
  QuizResults,
  SessionResponse,
  SessionStatus,
  SessionTopicEvent,
  VoteResults,
  WordEntry,
} from '../models/session.model';
import { SessionApiService, SessionResultsFormat } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

const SESSION_TOPIC_PREFIX = '/topic/collaboratif/session/';

/** WORDCLOUD font-size bounds (rem) — smallest word vs. the most-cited one. */
const WORD_SIZE_MIN_REM = 1;
const WORD_SIZE_MAX_REM = 3;

/** One category bucket of BRAINSTORM cards for the grouped results board (US19.4.1). */
export interface BrainstormCategoryGroup {
  readonly category: string | null;
  readonly cards: BrainstormCard[];
}

/** Maps a lifecycle event type to the resulting session status. */
function statusForLifecycle(type: 'SESSION_PAUSED' | 'SESSION_RESUMED' | 'SESSION_ENDED'): SessionStatus {
  switch (type) {
    case 'SESSION_PAUSED':
      return 'PAUSED';
    case 'SESSION_RESUMED':
      return 'LIVE';
    case 'SESSION_ENDED':
      return 'COMPLETED';
  }
}

/**
 * Facilitator's real-time results view for a live session (US19.4.1) — the animator-facing
 * counterpart to the participant shell (US19.2.2). Loads the facilitator-authoritative session
 * (`getSession`), hydrates a per-type snapshot, then — while the session is `LIVE`/`PAUSED` — keeps
 * it current from the same shared STOMP topic (`/topic/collaboratif/session/{id}`) the participants
 * use, differentiated by each event's `type`. A `COMPLETED` session renders a frozen snapshot with
 * no WS connection. A projection toggle enlarges the view for a shared screen.
 *
 * Read-only: this view never mutates the session; every render is interpolation only (no
 * `innerHTML`), `OnPush` + signals, zero `any`.
 */
@Component({
  selector: 'app-session-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './session-results.component.html',
  styleUrl: './session-results.component.scss',
})
export class SessionResultsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SessionApiService);
  private readonly ws = inject(SessionWsService);

  readonly session = signal<SessionResponse | null>(null);
  readonly loadError = signal(false);
  readonly projection = signal(false);

  readonly pollResults = signal<PollOptionResult[]>([]);
  readonly words = signal<WordEntry[]>([]);
  readonly questions = signal<QaQuestion[]>([]);
  readonly cards = signal<BrainstormCard[]>([]);
  readonly voteResults = signal<VoteResults | null>(null);
  readonly quizResults = signal<QuizResults | null>(null);

  readonly exporting = signal(false);
  readonly exportError = signal(false);

  private wsSub: Subscription | null = null;
  private connected = false;

  readonly type = computed(() => this.session()?.type ?? null);
  readonly status = computed(() => this.session()?.status ?? null);

  /** POLL: total votes across options, for the percent fallback when the backend omits `percent`. */
  readonly pollTotal = computed(() =>
    this.pollResults().reduce((sum, option) => sum + (option.count ?? 0), 0),
  );

  /** WORDCLOUD: largest frequency, so font sizes scale relative to the most-cited word. */
  private readonly maxFrequency = computed(() =>
    this.words().reduce((max, entry) => Math.max(max, entry.frequency), 1),
  );

  /** Q&A: upvotes desc, oldest-first tie-break — same order as the participant list. */
  readonly sortedQuestions = computed(() =>
    [...this.questions()].sort((a, b) => b.upvotes - a.upvotes || a.createdAt.localeCompare(b.createdAt)),
  );

  /** BRAINSTORM: cards bucketed by category (alphabetical), uncategorized (`null`) last. */
  readonly cardGroups = computed<BrainstormCategoryGroup[]>(() => {
    const buckets = new Map<string | null, BrainstormCard[]>();
    for (const card of this.cards()) {
      const bucket = buckets.get(card.category) ?? [];
      bucket.push(card);
      buckets.set(card.category, bucket);
    }
    const named = [...buckets.entries()]
      .filter((entry): entry is [string, BrainstormCard[]] => entry[0] !== null)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, cards]) => ({ category, cards }));
    const uncategorized = buckets.get(null);
    return uncategorized ? [...named, { category: null, cards: uncategorized }] : named;
  });

  /** QUIZ: leaderboard from the backend, defensively re-sorted by score descending. */
  readonly leaderboard = computed<LeaderboardEntry[]>(() =>
    [...(this.quizResults()?.leaderboard ?? [])].sort((a, b) => b.score - a.score),
  );

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      this.loadError.set(true);
      return;
    }
    this.api.getSession(sessionId).subscribe({
      next: session => {
        this.session.set(session);
        this.hydrate(session);
        if (session.status === 'LIVE' || session.status === 'PAUSED') {
          this.ws.connect(`${SESSION_TOPIC_PREFIX}${session.id}`);
          this.connected = true;
          this.wsSub = this.ws.messages$.subscribe(body => this.onMessage(body));
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    if (this.connected) {
      this.ws.disconnect();
    }
  }

  toggleProjection(): void {
    this.projection.update(on => !on);
  }

  /**
   * Downloads the completed session's results in `format` (US19.4.2). Only meaningful for a
   * `COMPLETED` session — the export controls are shown only then, and the backend returns `409`
   * for a session still in progress (surfaced as {@link exportError}).
   */
  downloadResults(format: SessionResultsFormat): void {
    const session = this.session();
    if (!session || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exportError.set(false);
    this.api.exportResults(session.id, format).subscribe({
      next: blob => {
        this.exporting.set(false);
        this.saveBlob(blob, `${session.title}.${format}`);
      },
      error: () => {
        this.exporting.set(false);
        this.exportError.set(true);
      },
    });
  }

  /** Triggers a browser download of `blob` as `filename` (no-op where the Blob URL API is absent). */
  private saveBlob(blob: Blob, filename: string): void {
    if (typeof URL.createObjectURL !== 'function') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Relative font size (rem) for a WORDCLOUD entry, scaled by its share of the top frequency. */
  wordSize(frequency: number): number {
    return WORD_SIZE_MIN_REM + (WORD_SIZE_MAX_REM - WORD_SIZE_MIN_REM) * (frequency / this.maxFrequency());
  }

  private hydrate(session: SessionResponse): void {
    switch (session.type) {
      case 'POLL':
        this.api.getPollResults(session.id).subscribe({
          next: results => this.pollResults.set(results),
          error: () => this.pollResults.set([]),
        });
        break;
      case 'WORDCLOUD':
        this.api.listWordcloudWords(session.id).subscribe({
          next: words => this.words.set(words),
          error: () => this.words.set([]),
        });
        break;
      case 'QA':
        this.api.listQaQuestions(session.id).subscribe({
          next: questions => this.questions.set(questions),
          error: () => this.questions.set([]),
        });
        break;
      case 'BRAINSTORM':
        this.api.listBrainstormCards(session.id).subscribe({
          next: cards => this.cards.set(cards),
          error: () => this.cards.set([]),
        });
        break;
      case 'VOTE':
        this.api.getVoteResults(session.id).subscribe({
          next: results => this.voteResults.set(results),
          error: () => this.voteResults.set(null),
        });
        break;
      case 'QUIZ':
        this.api.getQuizResults(session.id).subscribe({
          next: results => this.quizResults.set(results),
          error: () => this.quizResults.set(null),
        });
        break;
    }
  }

  private onMessage(body: string): void {
    let event: SessionTopicEvent;
    try {
      event = JSON.parse(body) as SessionTopicEvent;
    } catch {
      return;
    }
    switch (event.type) {
      case 'POLL_UPDATED':
        this.pollResults.set(event.results);
        break;
      case 'WORD_ADDED':
        this.upsertWord(event.entry);
        break;
      case 'WORD_REMOVED':
        this.words.update(words => words.filter(word => word.word !== event.word));
        break;
      case 'QUESTION_ADDED':
        this.questions.update(questions => [...questions, event.question]);
        break;
      case 'QUESTION_UPVOTED':
        this.questions.update(questions =>
          questions.map(question =>
            question.id === event.questionId ? { ...question, upvotes: event.upvotes } : question,
          ),
        );
        break;
      case 'QUESTION_ANSWERED':
        this.questions.update(questions =>
          questions.map(question =>
            question.id === event.questionId ? { ...question, answered: true } : question,
          ),
        );
        break;
      case 'CARD_ADDED':
        this.cards.update(cards => [...cards, event.card]);
        break;
      case 'CARD_UPDATED':
        this.cards.update(cards => cards.map(card => (card.id === event.card.id ? event.card : card)));
        break;
      case 'CARD_REMOVED':
        this.cards.update(cards => cards.filter(card => card.id !== event.cardId));
        break;
      case 'VOTE_CLOSED':
        this.voteResults.set(event.results);
        break;
      case 'QUESTION_ENDED':
        this.quizResults.update(current => ({
          leaderboard: event.leaderboard,
          correctRatePerQuestion: current?.correctRatePerQuestion ?? [],
        }));
        break;
      case 'SESSION_PAUSED':
      case 'SESSION_RESUMED':
      case 'SESSION_ENDED':
        this.session.update(session =>
          session ? { ...session, status: statusForLifecycle(event.type) } : session,
        );
        break;
    }
  }

  private upsertWord(entry: WordEntry): void {
    this.words.update(words => {
      const index = words.findIndex(word => word.word === entry.word);
      if (index === -1) {
        return [...words, entry];
      }
      const next = [...words];
      next[index] = entry;
      return next;
    });
  }
}
