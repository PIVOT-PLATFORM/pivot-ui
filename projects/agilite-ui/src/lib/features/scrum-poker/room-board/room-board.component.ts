import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { RoomWsService } from '../room-ws.service';
import {
  AttributedVote,
  ConsensusResponse,
  RosterParticipant,
  RoomTopicEvent,
  TicketProblemDetail,
  TicketResponse,
} from '../ticket.model';
import { TicketService } from '../ticket.service';

/** Maximum ticket title length accepted by the backend (US09.2.1). */
const TITLE_MAX_LENGTH = 200;

/**
 * Realtime planning poker "board" (US09.2.1): facilitator-only ticket creation, the room's deck
 * (E09) as clickable cards, a live masked "X/Y have voted" counter, and the named roster.
 *
 * Mounted by both {@link CreateRoomComponent} (facilitator) and {@link JoinRoomComponent}
 * (authenticated participant and anonymous guest, US09.1.2/US09.3.1) once each has already
 * opened the room's STOMP connection via {@link RoomWsService} — this component never connects
 * or disconnects the socket itself, only subscribes to {@link RoomWsService.messages$} and calls
 * {@link RoomWsService.submitVote}. No business logic beyond orchestration: {@link TicketService}
 * owns every HTTP call.
 *
 * **Pick-then-Valider (E09 — classic parity).** Clicking a card ({@link selectCard}) only
 * highlights it locally — nothing is sent to the server. The chosen card is freely changeable
 * until {@link validateVote} is called (the "Valider" button), which is the ONLY point a vote is
 * actually submitted over STOMP; once validated, the cards lock ({@link hasValidated}) until the
 * next ticket. This mirrors the classic physical/`agile-tools.fr` flow ("il peut le modifier à
 * volonté tant qu'il n'a pas cliqué sur le bouton «Valider»") and, as a side effect, means the
 * server (and therefore the roster's masked "has voted" square) only ever learns about a
 * participant's vote once they have validated it — never a mid-deliberation pick.
 *
 * **Masked-until-reveal (AC):** {@link votedCount}/{@link totalParticipants} are the only
 * server-driven state derived from `VOTE_CAST` events — {@link selectedValue} (the participant's
 * own highlighted card) is purely local UI state, never derived from anything the server sends
 * back; the server never echoes a chosen value to anyone, proven server-side by
 * `PokerVoteSubmissionIT`'s raw-payload inspection.
 *
 * Since US09.2.2, also handles **revealing** the current ticket (facilitator only, at any point
 * while `VOTING` — no completeness gate) and rendering the resulting `attributedVotes`/
 * `consensus` (mean/median over the numeric subset, majority over every raw value including
 * `"?"`), applied identically whether it arrives via the REST response or the `VOTES_REVEALED`
 * broadcast. Each vote is attributed to the voting participant's roster name (E09 — classic
 * parity; the pre-E09 anonymous `values: string[]` shape no longer exists on the wire).
 *
 * Since US09.2.3, also handles **reset** (facilitator only, on a `REVEALED`, non-finalized
 * ticket — relaunches a round of voting, clearing the previous round's revealed state) and
 * **finalization** (facilitator only, same eligibility — persists a chosen final estimate,
 * terminal for the ticket). Both are applied identically whether they arrive via their REST
 * response or the `TICKET_RESET`/`TICKET_FINALIZED` broadcast.
 */
@Component({
  selector: 'app-room-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './room-board.component.html',
  styleUrl: './room-board.component.scss',
})
export class RoomBoardComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  /** Injected (not wrapped) — already connected by the parent (create-room/join-room). */
  protected readonly roomWs = inject(RoomWsService);

  /** The room this board belongs to. */
  readonly roomId = input.required<string>();

  /** The room's fixed Fibonacci card values (from the create/join response — never re-derived). */
  readonly cardValues = input.required<readonly string[]>();

  /** Whether the caller is this room's facilitator — gates the ticket-creation form. */
  readonly isFacilitator = input(false);

  /** The room's currently open ticket, or `null` before the first one is created. */
  protected readonly currentTicket = signal<TicketResponse | null>(null);

  /** Masked vote count for the current ticket — never a card value. */
  protected readonly votedCount = signal(0);

  /** Total participants currently registered in the room. */
  protected readonly totalParticipants = signal(0);

  /**
   * The room's live named roster (E09), from `ROSTER_UPDATED` broadcasts — each participant's
   * name, role, and masked "has voted" state for the open ticket. Empty until the first roster
   * event arrives.
   */
  protected readonly roster = signal<readonly RosterParticipant[]>([]);

  /** The caller's own selected card — purely local state, never sent back by the server. */
  protected readonly selectedValue = signal<string | null>(null);

  /**
   * Whether the caller has clicked "Valider" for the current ticket (E09) — the only point
   * {@link selectedValue} is actually submitted to the server. Locks the cards until the next
   * ticket ({@link applyNewTicket} resets it).
   */
  protected readonly hasValidated = signal(false);

  /** Reactive form holding the new ticket's title (facilitator only). */
  protected readonly titleForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(TITLE_MAX_LENGTH)]],
  });

  /** True while a ticket-creation request is in flight — disables the submit button. */
  protected readonly creatingTicket = signal(false);

  /** i18n key of the current ticket-creation error, or `null` when there is none. */
  protected readonly createTicketErrorKey = signal<string | null>(null);

  /** Every cast vote once the current ticket has been revealed (US09.2.2), attributed to its
   *  voting participant's roster name, else `null`. */
  protected readonly revealedVotes = signal<readonly AttributedVote[] | null>(null);

  /** The computed consensus once the current ticket has been revealed (US09.2.2), else `null`. */
  protected readonly consensus = signal<ConsensusResponse | null>(null);

  /** True while a reveal request is in flight — disables the reveal button. */
  protected readonly revealing = signal(false);

  /** i18n key of the current reveal error, or `null` when there is none. */
  protected readonly revealErrorKey = signal<string | null>(null);

  /**
   * The current ticket's persisted final estimate (US09.2.3), or `null` if not yet finalized —
   * a terminal state once set (neither reset nor a second finalization is possible afterward).
   */
  protected readonly finalEstimate = signal<string | null>(null);

  /**
   * The facilitator's current choice in the final-estimate `<select>` (US09.2.3) — purely local
   * UI state until {@link finalizeVote} submits it. Pre-filled with the consensus majority at
   * reveal time when available (AC), otherwise empty.
   */
  protected readonly finalEstimateChoice = signal('');

  /**
   * Number of times the current ticket has been reset (US09.2.3) — in-memory only, never
   * persisted or fetched from the server (AC "Hors périmètre"), reset to 0 whenever a genuinely
   * new ticket opens.
   */
  protected readonly resetCount = signal(0);

  /** True while a reset request is in flight — disables the reset button. */
  protected readonly resetting = signal(false);

  /** i18n key of the current reset error, or `null` when there is none. */
  protected readonly resetErrorKey = signal<string | null>(null);

  /** True while a finalize request is in flight — disables the finalize button. */
  protected readonly finalizing = signal(false);

  /** i18n key of the current finalize error, or `null` when there is none. */
  protected readonly finalizeErrorKey = signal<string | null>(null);

  ngOnInit(): void {
    this.roomWs.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(body => this.onMessage(body));
    this.loadCurrentTicket();
  }

  /**
   * Creates a new ticket (facilitator only). No-ops if the form is invalid or a request is
   * already in flight.
   */
  protected createTicket(): void {
    if (this.titleForm.invalid || this.creatingTicket()) {
      this.titleForm.markAllAsTouched();
      return;
    }

    this.creatingTicket.set(true);
    this.createTicketErrorKey.set(null);

    const title = this.titleForm.getRawValue().title.trim();
    this.ticketService.createTicket(this.roomId(), { title }).subscribe({
      next: ticket => {
        this.creatingTicket.set(false);
        this.applyNewTicket(ticket);
        this.titleForm.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.creatingTicket.set(false);
        this.createTicketErrorKey.set(this.resolveCreateErrorKey(error));
      },
    });
  }

  /**
   * Selects (or changes to) a card for the current ticket — purely local, highlights it without
   * submitting anything to the server (E09 — pick-then-Valider). No-ops if no ticket is currently
   * open, the ticket is not `VOTING`, or the caller has already {@link validateVote validated}
   * their vote for this ticket (cards lock after Valider).
   *
   * @param value the chosen card value
   */
  protected selectCard(value: string): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.status !== 'VOTING' || this.hasValidated()) {
      return;
    }
    this.selectedValue.set(value);
  }

  /**
   * Submits the currently selected card as the caller's final vote for this ticket (E09 —
   * "Valider" button) and locks further card changes ({@link hasValidated}) until the next
   * ticket. No-ops if no ticket is open, it is not `VOTING`, no card is selected yet, or a vote
   * was already validated for this ticket.
   */
  protected validateVote(): void {
    const ticket = this.currentTicket();
    const value = this.selectedValue();
    if (!ticket || ticket.status !== 'VOTING' || value === null || this.hasValidated()) {
      return;
    }
    this.roomWs.submitVote({ ticketId: ticket.id, value });
    this.hasValidated.set(true);
  }

  /**
   * Reveals the current ticket's votes (facilitator only) — permitted at any point while the
   * ticket is `VOTING`, regardless of {@link votedCount}/{@link totalParticipants} (no
   * completeness gate, US09.2.2 AC). No-ops if no ticket is active or a request is already in
   * flight.
   */
  protected revealVotes(): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.status !== 'VOTING' || this.revealing()) {
      return;
    }

    this.revealing.set(true);
    this.revealErrorKey.set(null);

    this.ticketService.revealTicket(this.roomId(), ticket.id).subscribe({
      next: reveal => {
        this.revealing.set(false);
        this.applyReveal(reveal.id, reveal.status, reveal.attributedVotes, reveal.consensus);
      },
      error: (error: HttpErrorResponse) => {
        this.revealing.set(false);
        this.revealErrorKey.set(this.resolveRevealErrorKey(error));
      },
    });
  }

  /** The masked "X/Y have voted" pair, for the template's parameterized translation. */
  protected counterParams(): { voted: number; total: number } {
    return { voted: this.votedCount(), total: this.totalParticipants() };
  }

  /**
   * Relaunches a round of voting on the current ticket (facilitator only, US09.2.3) — permitted
   * only while the ticket is `REVEALED` and not yet finalized. No-ops otherwise, or if a request
   * is already in flight.
   */
  protected resetVote(): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.status !== 'REVEALED' || this.finalEstimate() !== null || this.resetting()) {
      return;
    }

    this.resetting.set(true);
    this.resetErrorKey.set(null);

    this.ticketService.resetTicket(this.roomId(), ticket.id).subscribe({
      next: () => {
        this.resetting.set(false);
        this.applyTicketReset(ticket.id);
      },
      error: (error: HttpErrorResponse) => {
        this.resetting.set(false);
        this.resetErrorKey.set(this.resolveResetErrorKey(error));
      },
    });
  }

  /**
   * Validates the facilitator's chosen final estimate on the current ticket (facilitator only,
   * US09.2.3) — permitted only while the ticket is `REVEALED`, not yet finalized, and a value has
   * been chosen. No-ops otherwise, or if a request is already in flight.
   */
  protected finalizeVote(): void {
    const ticket = this.currentTicket();
    const value = this.finalEstimateChoice();
    if (
      !ticket ||
      ticket.status !== 'REVEALED' ||
      this.finalEstimate() !== null ||
      !value ||
      this.finalizing()
    ) {
      return;
    }

    this.finalizing.set(true);
    this.finalizeErrorKey.set(null);

    this.ticketService.finalizeTicket(this.roomId(), ticket.id, value).subscribe({
      next: finalized => {
        this.finalizing.set(false);
        this.applyFinalize(finalized.id, finalized.finalEstimate);
      },
      error: (error: HttpErrorResponse) => {
        this.finalizing.set(false);
        this.finalizeErrorKey.set(this.resolveFinalizeErrorKey(error));
      },
    });
  }

  private loadCurrentTicket(): void {
    this.ticketService.getCurrentTicket(this.roomId()).subscribe({
      next: ticket => {
        if (ticket) {
          this.applyNewTicket(ticket);
        }
      },
      // Best-effort: an account-less guest without a resolvable bearer token (US09.3.1) simply
      // waits for the next TICKET_CREATED broadcast instead — never a blocking error.
      error: () => undefined,
    });
  }

  private applyNewTicket(ticket: TicketResponse): void {
    this.currentTicket.set(ticket);
    this.votedCount.set(0);
    this.selectedValue.set(null);
    this.hasValidated.set(false);
    this.revealedVotes.set(null);
    this.consensus.set(null);
    this.revealErrorKey.set(null);
    this.finalEstimate.set(null);
    this.finalEstimateChoice.set('');
    this.resetCount.set(0);
    this.resetErrorKey.set(null);
    this.finalizeErrorKey.set(null);
  }

  /**
   * Applies a revealed-votes state — called both from the REST reveal response and from the
   * `VOTES_REVEALED` broadcast, idempotently (setting the same values twice, e.g. once from each
   * source for the facilitator's own reveal, is harmless). Pre-fills {@link finalEstimateChoice}
   * with the consensus majority when available (US09.2.3 AC), otherwise leaves it empty.
   *
   * @param ticketId        the revealed ticket's id — ignored if it does not match the currently
   *                        displayed ticket (a stale/out-of-order event)
   * @param status          the ticket's new status, always `"REVEALED"`
   * @param attributedVotes every cast vote, attributed to its voting participant's roster name
   * @param consensus       the computed consensus
   */
  private applyReveal(
    ticketId: string,
    status: TicketResponse['status'],
    attributedVotes: readonly AttributedVote[],
    consensus: ConsensusResponse,
  ): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.id !== ticketId) {
      return;
    }
    this.currentTicket.set({ ...ticket, status });
    this.revealedVotes.set(attributedVotes);
    this.consensus.set(consensus);
    this.finalEstimateChoice.set(consensus.majority ?? '');
  }

  /**
   * Applies a ticket reset (US09.2.3) — called both from the REST reset response and from the
   * `TICKET_RESET` broadcast, idempotently. Reverts to the same "waiting to vote" state as a
   * brand-new ticket, without discarding the ticket's identity/title/`createdAt`.
   *
   * @param ticketId the reset ticket's id — ignored if it does not match the currently displayed
   *                 ticket (a stale/out-of-order event)
   */
  private applyTicketReset(ticketId: string): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.id !== ticketId) {
      return;
    }
    this.currentTicket.set({ ...ticket, status: 'VOTING' });
    this.votedCount.set(0);
    this.selectedValue.set(null);
    this.hasValidated.set(false);
    this.revealedVotes.set(null);
    this.consensus.set(null);
    this.finalEstimate.set(null);
    this.finalEstimateChoice.set('');
    this.resetCount.update(count => count + 1);
  }

  /**
   * Applies a ticket finalization (US09.2.3) — called both from the REST finalize response and
   * from the `TICKET_FINALIZED` broadcast, idempotently.
   *
   * @param ticketId      the finalized ticket's id — ignored if it does not match the currently
   *                      displayed ticket (a stale/out-of-order event)
   * @param finalEstimate the persisted final estimate
   */
  private applyFinalize(ticketId: string, finalEstimate: string): void {
    const ticket = this.currentTicket();
    if (!ticket || ticket.id !== ticketId) {
      return;
    }
    this.finalEstimate.set(finalEstimate);
  }

  private onMessage(body: string): void {
    let event: RoomTopicEvent;
    try {
      event = JSON.parse(body) as RoomTopicEvent;
    } catch {
      return;
    }
    switch (event.type) {
      case 'TICKET_CREATED':
        this.applyNewTicket({
          id: event.ticketId,
          roomId: event.roomId,
          title: event.title,
          status: 'VOTING',
          createdAt: event.createdAt,
        });
        break;
      case 'VOTE_CAST':
        this.votedCount.set(event.votedCount);
        this.totalParticipants.set(event.totalParticipants);
        break;
      case 'VOTES_REVEALED':
        this.applyReveal(event.ticketId, 'REVEALED', event.attributedVotes, event.consensus);
        break;
      case 'ROSTER_UPDATED':
        this.roster.set(event.participants);
        break;
      case 'TICKET_RESET':
        this.applyTicketReset(event.ticketId);
        break;
      case 'TICKET_FINALIZED':
        this.applyFinalize(event.ticketId, event.finalEstimate);
        break;
    }
  }

  /**
   * Maps a ticket-creation HTTP error to an i18n key, without leaking raw backend error text.
   *
   * @param error the HTTP error response
   * @returns the i18n key describing the error
   */
  private resolveCreateErrorKey(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'scrumPoker.roomBoard.errors.facilitatorOnly';
    }
    if (error.status === 409) {
      return 'scrumPoker.roomBoard.errors.activeTicketExists';
    }
    if (error.status === 400) {
      const body = error.error as TicketProblemDetail | null;
      if (body?.code === 'INVALID_TITLE') {
        return 'scrumPoker.roomBoard.errors.invalidTitle';
      }
      return 'scrumPoker.roomBoard.errors.invalidRequest';
    }
    return 'scrumPoker.roomBoard.errors.generic';
  }

  /**
   * Maps a reveal HTTP error to an i18n key, without leaking raw backend error text.
   *
   * @param error the HTTP error response
   * @returns the i18n key describing the error
   */
  private resolveRevealErrorKey(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'scrumPoker.roomBoard.errors.facilitatorOnly';
    }
    if (error.status === 404) {
      return 'scrumPoker.roomBoard.errors.ticketNotFound';
    }
    if (error.status === 409) {
      return 'scrumPoker.roomBoard.errors.ticketAlreadyRevealed';
    }
    return 'scrumPoker.roomBoard.errors.generic';
  }

  /**
   * Maps a reset HTTP error to an i18n key, without leaking raw backend error text (US09.2.3).
   *
   * @param error the HTTP error response
   * @returns the i18n key describing the error
   */
  private resolveResetErrorKey(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'scrumPoker.roomBoard.errors.facilitatorOnly';
    }
    if (error.status === 404) {
      return 'scrumPoker.roomBoard.errors.ticketNotFound';
    }
    if (error.status === 409) {
      const body = error.error as TicketProblemDetail | null;
      if (body?.code === 'TICKET_ALREADY_FINALIZED') {
        return 'scrumPoker.roomBoard.errors.ticketAlreadyFinalized';
      }
      return 'scrumPoker.roomBoard.errors.ticketNotRevealed';
    }
    return 'scrumPoker.roomBoard.errors.generic';
  }

  /**
   * Maps a finalize HTTP error to an i18n key, without leaking raw backend error text (US09.2.3).
   *
   * @param error the HTTP error response
   * @returns the i18n key describing the error
   */
  private resolveFinalizeErrorKey(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'scrumPoker.roomBoard.errors.facilitatorOnly';
    }
    if (error.status === 404) {
      return 'scrumPoker.roomBoard.errors.ticketNotFound';
    }
    if (error.status === 409) {
      const body = error.error as TicketProblemDetail | null;
      if (body?.code === 'TICKET_ALREADY_FINALIZED') {
        return 'scrumPoker.roomBoard.errors.ticketAlreadyFinalized';
      }
      return 'scrumPoker.roomBoard.errors.ticketNotRevealed';
    }
    if (error.status === 400) {
      const body = error.error as TicketProblemDetail | null;
      if (body?.code === 'INVALID_FINAL_ESTIMATE') {
        return 'scrumPoker.roomBoard.errors.invalidFinalEstimate';
      }
      return 'scrumPoker.roomBoard.errors.invalidFinalEstimateValue';
    }
    return 'scrumPoker.roomBoard.errors.generic';
  }
}
