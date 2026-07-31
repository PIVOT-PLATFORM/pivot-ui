import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import {
  BingoCell,
  BingoParticipantRole,
  BingoRoomStatus,
  BingoTopicEvent,
  BingoWonEvent,
  BingoWsErrorPayload,
} from '../models/bingo.model';
import { BingoApiService } from '../services/bingo-api.service';
import { BingoWsService } from '../services/bingo-ws.service';
import { BingoJoinNavigationState } from '../bingo-join/bingo-join.component';

/** One row of the "who has marked how many cells" progress table (AC-FE-03). */
export interface BingoProgressRow {
  readonly participantId: string;
  readonly displayName: string;
  readonly markedCount: number;
}

/**
 * The Bingo board (AC-47.1.1-04/06/07/08/09/10/11, FE-01..05, A11Y-01..04) — grid for a
 * `PLAYER`, progress table + victory banner for everyone (including a `SPECTATOR`, who never
 * sees a grid, FE-05).
 *
 * <p>Optimistic marking (FE-02): a click flips the local cell state immediately, then sends the
 * mark over WS; a rejection (`/user/queue/errors`) rolls the <em>last</em> optimistic toggle
 * back. The room-wide "who has marked how many" table (FE-03) is driven entirely by
 * `CELL_MARKED`/`PARTICIPANT_JOINED` broadcasts — this component's own marked count is derived
 * from local grid state, never trusted from a broadcast, since a `CELL_MARKED` payload never
 * carries enough to distinguish "this is my own row" from another participant's (SEC-04 — no
 * identity beyond an opaque `participantId` is ever exposed for that purpose either).
 */
@Component({
  selector: 'app-bingo-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './bingo-board.component.html',
  styleUrl: './bingo-board.component.scss',
})
export class BingoBoardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bingoApi = inject(BingoApiService);
  protected readonly bingoWs = inject(BingoWsService);

  protected readonly role = signal<BingoParticipantRole>('PLAYER');
  protected readonly status = signal<BingoRoomStatus>('OPEN');
  protected readonly cells = signal<BingoCell[]>([]);
  protected readonly progress = signal<Map<string, BingoProgressRow>>(new Map());
  protected readonly winner = signal<BingoWonEvent | null>(null);
  protected readonly wsError = signal<string | null>(null);

  protected readonly isSpectator = computed(() => this.role() === 'SPECTATOR');
  protected readonly isFinished = computed(() => this.status() === 'FINISHED' || this.winner() !== null);
  protected readonly progressRows = computed(() => Array.from(this.progress().values()));

  /** Known WS rejection codes with a dedicated i18n key — anything else falls back to generic. */
  private static readonly KNOWN_ERROR_CODES = ['SPECTATOR_CANNOT_MARK', 'INVALID_CELL', 'ROOM_FINISHED'];

  protected readonly errorMessageKey = computed(() => {
    const code = this.wsError();
    if (code && BingoBoardComponent.KNOWN_ERROR_CODES.includes(code)) {
      return `bingo.board.errors.${code}`;
    }
    return code ? 'bingo.board.errors.generic' : null;
  });

  private roomId = '';
  private accessToken = '';
  private lastOptimisticIndex: number | null = null;
  private messagesSubscription: Subscription | null = null;
  private errorsSubscription: Subscription | null = null;

  ngOnInit(): void {
    const state = this.router.getCurrentNavigation()?.extras.state as BingoJoinNavigationState | undefined;
    const nav = state ?? (history.state as BingoJoinNavigationState | undefined);
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? nav?.roomId ?? '';

    if (!nav) {
      // Reload/direct-link with no navigation state — reconnect is out of this component's
      // scope without a persisted accessToken; route back to join (mirrors SessionParticipantShell
      // precedent: a bare deep link with no state cannot resume a live room).
      void this.router.navigate(['/bingo/join']);
      return;
    }

    this.roomId = nav.roomId;
    this.accessToken = nav.accessToken;
    this.role.set(nav.role as BingoParticipantRole);
    this.status.set(nav.status as BingoRoomStatus);
    this.cells.set(((nav.grid as { cells: BingoCell[] } | null)?.cells ?? []).slice().sort((a, b) => a.cellIndex - b.cellIndex));

    this.bingoWs.connect(nav.wsTopic, this.roomId, this.accessToken, nav.isAnonymous);
    this.messagesSubscription = this.bingoWs.messages$.subscribe(body => this.handleMessage(body));
    this.errorsSubscription = this.bingoWs.errors$.subscribe(body => this.handleWsErrorBody(body));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.errorsSubscription?.unsubscribe();
    this.bingoWs.disconnect();
  }

  /** Handles a click on one grid cell (`PLAYER` only, disabled once finished — FE-02/FE-04). */
  onCellClick(cell: BingoCell): void {
    if (this.isSpectator() || this.isFinished()) {
      return;
    }
    const nextMarked = !cell.marked;
    this.lastOptimisticIndex = cell.cellIndex;
    this.cells.update(current =>
      current.map(c => (c.cellIndex === cell.cellIndex ? { ...c, marked: nextMarked } : c)),
    );
    this.bingoWs.mark(cell.cellIndex, nextMarked);
  }

  /** Re-fetches the grid from the server (reconnection path, AC-47.1.1-05). */
  reload(): void {
    if (!this.roomId || !this.accessToken) {
      return;
    }
    this.bingoApi.getGrid(this.roomId, this.accessToken).subscribe(response => {
      this.status.set(response.status);
      this.role.set(response.role);
      if (response.grid) {
        this.cells.set(response.grid.cells.slice().sort((a, b) => a.cellIndex - b.cellIndex));
      }
    });
  }

  private handleMessage(body: string): void {
    let event: BingoTopicEvent;
    try {
      event = JSON.parse(body) as BingoTopicEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'PARTICIPANT_JOINED': {
        const rows = new Map(this.progress());
        const existing = rows.get(event.participantId);
        rows.set(event.participantId, {
          participantId: event.participantId,
          displayName: event.displayName,
          markedCount: existing?.markedCount ?? 0,
        });
        this.progress.set(rows);
        break;
      }
      case 'CELL_MARKED': {
        const rows = new Map(this.progress());
        const existing = rows.get(event.participantId);
        rows.set(event.participantId, {
          participantId: event.participantId,
          displayName: existing?.displayName ?? event.participantId,
          markedCount: event.markedCount,
        });
        this.progress.set(rows);
        break;
      }
      case 'BINGO':
        this.status.set('FINISHED');
        this.winner.set(event);
        break;
    }
  }

  /** Parses a `/user/queue/errors` frame body and rolls back the most recent optimistic toggle. */
  private handleWsErrorBody(body: string): void {
    let payload: BingoWsErrorPayload;
    try {
      payload = JSON.parse(body) as BingoWsErrorPayload;
    } catch {
      return;
    }
    this.wsError.set(payload.code ?? payload.error);
    if (this.lastOptimisticIndex !== null) {
      const index = this.lastOptimisticIndex;
      this.cells.update(current =>
        current.map(c => (c.cellIndex === index ? { ...c, marked: !c.marked } : c)),
      );
      this.lastOptimisticIndex = null;
    }
  }
}
