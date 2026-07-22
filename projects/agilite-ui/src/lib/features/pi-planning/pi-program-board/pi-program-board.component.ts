import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, transferArrayItem } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  PiBoardResponse,
  PiTicketResponse,
  PiTicketType,
} from '../models/pi-planning.model';
import { extractErrorCode } from '../services/pi-error.util';
import { PiBoardApiService } from '../services/pi-board-api.service';
import { PiDependencyLayerComponent } from '../pi-dependency-layer/pi-dependency-layer.component';

/** A single matrix cell — `teamId: null` = Train row, `iterationId: null` = "Unplanned" column. */
export interface BoardCell {
  readonly teamId: string | null;
  readonly iterationId: string | null;
}

/** Ticket type badges — color + short label, matching the reference POC's palette (never color alone, see A11y AC). */
export const TICKET_TYPES: { value: PiTicketType; color: string }[] = [
  { value: 'FEATURE', color: '#3b82f6' },
  { value: 'MILESTONE', color: '#8b5cf6' },
  { value: 'OBJECTIVE', color: '#f59e0b' },
  { value: 'RISK', color: '#f97316' },
  { value: 'STORY', color: '#6b7280' },
  { value: 'ENABLER', color: '#06b6d4' },
]

function cellKey(teamId: string | null, iterationId: string | null): string {
  return `${teamId ?? 'train'}:${iterationId ?? 'none'}`;
}

/** Draft state of the create/edit ticket panel — `id: null` means "creating a new ticket". */
interface TicketDraft {
  id: string | null;
  type: PiTicketType;
  title: string;
  description: string;
  teamId: string | null;
  iterationId: string | null;
}

/**
 * The Program Board (US50.3.1/US50.3.2) — a drag-drop matrix of Train teams (rows, Train row
 * first) × PI iterations (columns, "Unplanned" first), with typed tickets and dependency arrows.
 * No WebSocket (Gate 1 architecture decision, US50.3.1 AC) — plain REST with optimistic local
 * updates, rolled back on failure. UX inspired by the reference POC PouetPouet
 * (`apps/web/src/components/pi/program-board.tsx`), rebuilt with Angular CDK drag-drop and
 * signals rather than raw HTML5 DnD/React state.
 */
@Component({
  selector: 'app-pi-program-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, CdkDropListGroup, CdkDropList, CdkDrag, PiDependencyLayerComponent],
  templateUrl: './pi-program-board.component.html',
  styleUrl: './pi-program-board.component.scss',
})
export class PiProgramBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly boardApi = inject(PiBoardApiService);

  private readonly cycleId: string;

  readonly ticketTypes = TICKET_TYPES;

  readonly board = signal<PiBoardResponse | null>(null);
  readonly loadError = signal(false);
  readonly moveError = signal<string | null>(null);

  readonly linkMode = signal(false);
  readonly linkSourceId = signal<string | null>(null);
  readonly dependencyError = signal<string | null>(null);

  readonly draft = signal<TicketDraft | null>(null);
  readonly draftSaving = signal(false);
  readonly draftError = signal<string | null>(null);

  /** Rows: Train (id `null`) first, then Train teams in `order`. */
  readonly rows = computed(() => {
    const board = this.board();
    if (!board) {
      return [];
    }
    return [
      { id: null as string | null, name: 'train', color: '#0ea5e9' },
      ...[...board.teams].sort((a, b) => a.order - b.order).map(t => ({ id: t.id as string | null, name: t.name, color: t.color ?? '#6b7280' })),
    ];
  });

  /** Columns: "Unplanned" (id `null`) first, then iterations in `number` order. */
  readonly columns = computed(() => {
    const board = this.board();
    if (!board) {
      return [];
    }
    return [
      { id: null as string | null, label: null as string | null },
      ...[...board.iterations].sort((a, b) => a.number - b.number).map(it => ({ id: it.id as string | null, label: it.label })),
    ];
  });

  /** CSS Grid template — sticky team-label column plus one column per board column. */
  readonly gridTemplateColumns = computed(() => `180px repeat(${this.columns().length}, minmax(230px, 1fr))`);

  /** Tickets grouped by cell key, each cell's tickets sorted by `order`. */
  readonly ticketsByCell = computed(() => {
    const board = this.board();
    const map = new Map<string, PiTicketResponse[]>();
    if (!board) {
      return map;
    }
    for (const ticket of [...board.tickets].sort((a, b) => a.order - b.order)) {
      const key = cellKey(ticket.teamId, ticket.iterationId);
      const list = map.get(key) ?? [];
      list.push(ticket);
      map.set(key, list);
    }
    return map;
  });

  constructor() {
    this.cycleId = this.route.snapshot.paramMap.get('cycleId') ?? '';
  }

  ngOnInit(): void {
    this.loadBoard();
  }

  /** (Re)fetches the board — the only refresh mechanism at socle (no WebSocket, no polling). */
  loadBoard(): void {
    this.loadError.set(false);
    this.boardApi.getBoard(this.cycleId).subscribe({
      next: board => this.board.set(board),
      error: () => this.loadError.set(true),
    });
  }

  /** Returns this cell's tickets. */
  ticketsFor(cell: BoardCell): PiTicketResponse[] {
    return this.ticketsByCell().get(cellKey(cell.teamId, cell.iterationId)) ?? [];
  }

  /** `aria-label` for a drop cell — team/iteration identification (A11y AC). */
  cellAriaLabel(rowName: string, columnLabel: string | null): string {
    return `${rowName} · ${columnLabel ?? 'unplanned'}`;
  }

  /** The unique drop-list id for a cell, connected to every other cell via `cdkDropListGroup`. */
  dropListId(cell: BoardCell): string {
    return `pi-cell-${cellKey(cell.teamId, cell.iterationId)}`;
  }

  ticketColor(type: PiTicketType): string {
    return this.ticketTypes.find(t => t.value === type)?.color ?? '#6b7280';
  }

  /** Handles a drag-drop move — optimistic local update, `PATCH` confirmation, rollback on failure. */
  onDrop(event: CdkDragDrop<PiTicketResponse[]>, targetCell: BoardCell): void {
    const ticket = event.previousContainer.data[event.previousIndex];
    if (!ticket || event.previousContainer === event.container) {
      return;
    }
    const board = this.board();
    if (!board) {
      return;
    }
    const previousBoard = board;
    const targetTickets = this.ticketsFor(targetCell);
    const newOrder = targetTickets.length > 0 ? Math.max(...targetTickets.map(t => t.order)) + 1 : 0;

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.board.set({
      ...board,
      tickets: board.tickets.map(t =>
        t.id === ticket.id ? { ...t, teamId: targetCell.teamId, iterationId: targetCell.iterationId, order: newOrder } : t,
      ),
    });

    this.boardApi
      .updateTicket(this.cycleId, ticket.id, { teamId: targetCell.teamId, iterationId: targetCell.iterationId, order: newOrder })
      .subscribe({
        error: error => {
          this.board.set(previousBoard);
          this.moveError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
        },
      });
  }

  /** Opens the create-ticket panel for a given cell (keyboard-accessible add, no drag needed). */
  openCreate(cell: BoardCell): void {
    if (this.linkMode()) {
      return;
    }
    this.draft.set({ id: null, type: 'STORY', title: '', description: '', teamId: cell.teamId, iterationId: cell.iterationId });
    this.draftError.set(null);
  }

  /** Opens the detail panel for an existing ticket, or handles a link-mode source/target click. */
  onTicketClick(ticket: PiTicketResponse): void {
    if (this.linkMode()) {
      this.handleLinkClick(ticket);
      return;
    }
    this.draft.set({
      id: ticket.id,
      type: ticket.type,
      title: ticket.title,
      description: ticket.description ?? '',
      teamId: ticket.teamId,
      iterationId: ticket.iterationId,
    });
    this.draftError.set(null);
  }

  /** Closes the create/edit panel without saving. */
  closeDraft(): void {
    this.draft.set(null);
    this.draftError.set(null);
  }

  /** Updates the draft's title field. */
  onDraftTitleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update(d => (d ? { ...d, title: value } : d));
  }

  /** Updates the draft's description field. */
  onDraftDescriptionInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.draft.update(d => (d ? { ...d, description: value } : d));
  }

  /** Updates the draft's type field. */
  onDraftTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PiTicketType;
    this.draft.update(d => (d ? { ...d, type: value } : d));
  }

  /** Updates the draft's target team (keyboard-accessible alternative to drag-drop). */
  onDraftTeamChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.draft.update(d => (d ? { ...d, teamId: raw === '' ? null : raw } : d));
  }

  /** Updates the draft's target iteration (keyboard-accessible alternative to drag-drop). */
  onDraftIterationChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.draft.update(d => (d ? { ...d, iterationId: raw === '' ? null : raw } : d));
  }

  /** Saves the current draft — creates a new ticket or updates an existing one. */
  saveDraft(): void {
    const draft = this.draft();
    if (!draft || draft.title.trim().length === 0 || this.draftSaving()) {
      return;
    }
    this.draftSaving.set(true);
    this.draftError.set(null);

    const request$ =
      draft.id === null
        ? this.boardApi.createTicket(this.cycleId, {
            type: draft.type,
            title: draft.title.trim(),
            description: draft.description.trim() || undefined,
            teamId: draft.teamId,
            iterationId: draft.iterationId,
          })
        : this.boardApi.updateTicket(this.cycleId, draft.id, {
            type: draft.type,
            title: draft.title.trim(),
            description: draft.description.trim() || null,
            teamId: draft.teamId,
            iterationId: draft.iterationId,
          });

    request$.subscribe({
      next: () => {
        this.draftSaving.set(false);
        this.draft.set(null);
        this.loadBoard();
      },
      error: error => {
        this.draftSaving.set(false);
        this.draftError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
      },
    });
  }

  /** Deletes the ticket currently open in the draft panel. */
  deleteDraft(): void {
    const draft = this.draft();
    if (!draft || draft.id === null) {
      return;
    }
    this.boardApi.deleteTicket(this.cycleId, draft.id).subscribe({
      next: () => {
        this.draft.set(null);
        this.loadBoard();
      },
    });
  }

  /** Toggles "Lier" (link) mode — click a source ticket then a target ticket to create a dependency. */
  toggleLinkMode(): void {
    this.linkMode.update(v => !v);
    this.linkSourceId.set(null);
    this.dependencyError.set(null);
  }

  private handleLinkClick(ticket: PiTicketResponse): void {
    const source = this.linkSourceId();
    if (source === null) {
      this.linkSourceId.set(ticket.id);
      return;
    }
    if (source === ticket.id) {
      this.linkSourceId.set(null);
      return;
    }
    this.boardApi.createDependency(this.cycleId, { fromTicketId: source, toTicketId: ticket.id }).subscribe({
      next: () => {
        this.linkSourceId.set(null);
        this.loadBoard();
      },
      error: error => {
        this.linkSourceId.set(null);
        this.dependencyError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
      },
    });
  }

  /** Forwarded from {@link PiDependencyLayerComponent} — updates a dependency's status/note. */
  onUpdateDependency(depId: string, patch: { status?: 'OK' | 'BLOCKED'; note?: string | null }): void {
    this.boardApi.updateDependency(this.cycleId, depId, patch).subscribe({ next: () => this.loadBoard() });
  }

  /** Forwarded from {@link PiDependencyLayerComponent} — deletes a dependency. */
  onDeleteDependency(depId: string): void {
    this.boardApi.deleteDependency(this.cycleId, depId).subscribe({ next: () => this.loadBoard() });
  }
}
