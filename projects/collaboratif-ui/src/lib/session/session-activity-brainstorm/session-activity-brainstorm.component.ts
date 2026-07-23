import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BrainstormCard,
  BrainstormCardColor,
  ParticipantSessionResponse,
} from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/** The fixed post-it palette, mirroring the backend `BrainstormCardColor` enum. */
const COLORS: readonly BrainstormCardColor[] = ['YELLOW', 'PINK', 'BLUE', 'GREEN', 'ORANGE'];

/** Max post-it length — mirrors the backend `@Size(max = 280)`. */
const MAX_TEXT_LENGTH = 280;

/**
 * BRAINSTORM activity participant view (US19.3.4) — add coloured post-its, edit/delete your own
 * (the server rejects acting on another participant's card with a 403; the UI only offers those
 * controls on cards whose `authorParticipantId` matches the caller's own `participantId`), and see
 * the board update live from `CARD_ADDED`/`CARD_UPDATED`/`CARD_REMOVED` broadcasts.
 *
 * <p>Card text and the facilitator's category label are rendered exclusively through interpolation
 * (`{{ }}`), never `innerHTML` (US19.3.4 XSS AC).
 */
@Component({
  selector: 'app-session-activity-brainstorm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-brainstorm.component.html',
  styleUrl: './session-activity-brainstorm.component.scss',
})
export class SessionActivityBrainstormComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);
  /** The caller's own session-scoped participant id, for the edit/delete ownership check. */
  readonly participantId = input<string | null>(null);

  readonly colors = COLORS;
  readonly maxLength = MAX_TEXT_LENGTH;

  readonly draftText = signal('');
  readonly draftColor = signal<BrainstormCardColor>('YELLOW');
  readonly submitting = signal(false);
  readonly submitError = signal(false);

  readonly editingId = signal<string | null>(null);
  readonly editText = signal('');
  readonly editColor = signal<BrainstormCardColor>('YELLOW');

  /** The card currently awaiting delete confirmation (a two-step delete guards against misclicks). */
  readonly confirmDeleteId = signal<string | null>(null);

  private readonly cards = signal<BrainstormCard[]>([]);

  /** Cards in stable creation order. */
  readonly orderedCards = computed(() =>
    [...this.cards()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );

  readonly canAdd = computed(
    () => !this.disabled() && !this.submitting() && this.draftText().trim().length > 0,
  );

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    this.sessionApi.listBrainstormCards(this.session().id).subscribe({
      next: cards => this.cards.set(cards),
      error: () => this.cards.set([]),
    });
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  /** Whether the caller authored the given card (and may therefore edit/delete it). */
  isOwn(card: BrainstormCard): boolean {
    const me = this.participantId();
    return me !== null && card.authorParticipantId === me;
  }

  add(): void {
    if (!this.canAdd()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    this.sessionApi
      .addBrainstormCard(this.session().id, { text: this.draftText().trim(), color: this.draftColor() })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.draftText.set('');
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set(true);
        },
      });
  }

  startEdit(card: BrainstormCard): void {
    this.editingId.set(card.id);
    this.editText.set(card.text);
    this.editColor.set(card.color);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(cardId: string): void {
    if (this.editText().trim().length === 0) {
      return;
    }
    this.sessionApi
      .updateBrainstormCard(this.session().id, cardId, {
        text: this.editText().trim(),
        color: this.editColor(),
      })
      .subscribe({ next: () => this.editingId.set(null) });
  }

  /** Arms the delete confirmation for a card — the actual delete needs a second, explicit click. */
  requestDelete(cardId: string): void {
    this.confirmDeleteId.set(cardId);
  }

  /** Cancels a pending delete confirmation. */
  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  /** Confirms and performs the delete (US19.3.4). The card is removed live via `CARD_REMOVED`. */
  confirmDelete(cardId: string): void {
    this.confirmDeleteId.set(null);
    this.sessionApi.deleteBrainstormCard(this.session().id, cardId).subscribe();
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
    if (type === 'CARD_ADDED') {
      this.applyCardAdded((parsed as { card: BrainstormCard }).card);
    } else if (type === 'CARD_UPDATED') {
      this.applyCardUpdated((parsed as { card: BrainstormCard }).card);
    } else if (type === 'CARD_REMOVED') {
      this.applyCardRemoved((parsed as { cardId: string }).cardId);
    }
  }

  private applyCardAdded(card: BrainstormCard): void {
    this.cards.update(current => (current.some(c => c.id === card.id) ? current : [...current, card]));
  }

  private applyCardUpdated(card: BrainstormCard): void {
    this.cards.update(current => current.map(c => (c.id === card.id ? card : c)));
  }

  private applyCardRemoved(cardId: string): void {
    this.cards.update(current => current.filter(c => c.id !== cardId));
    if (this.editingId() === cardId) {
      this.editingId.set(null);
    }
    if (this.confirmDeleteId() === cardId) {
      this.confirmDeleteId.set(null);
    }
  }
}
