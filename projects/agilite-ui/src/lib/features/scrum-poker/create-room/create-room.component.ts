import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PokerDeck, ProblemDetailResponse, RoomResponse } from '../room.model';
import { RoomBoardComponent } from '../room-board/room-board.component';
import { RoomWsService } from '../room-ws.service';
import { RoomService } from '../room.service';

/** Maximum room name length accepted by the backend (US09.1.1). */
const NAME_MAX_LENGTH = 120;

/** Maximum facilitator display name length accepted by the backend for the roster (E09). */
const FACILITATOR_NAME_MAX_LENGTH = 40;

/**
 * Planning poker room creation form (US09.1.1, extended by E09's classic-parity rework): a name
 * field, a deck selector (Fibonacci / simplified Fibonacci / T-shirt), a "the facilitator also
 * votes" toggle, and an optional roster display name — then, once created, the generated invite
 * code AND a full shareable room URL, each with their own copy-to-clipboard action, plus
 * (US09.2.1) the realtime named-roster/ticket/voting board, since the facilitator now opens their
 * own STOMP connection right after creation (see {@link RoomResponse.accessToken}'s Javadoc for
 * the Gate 1 fix this relies on).
 *
 * No business logic lives here — {@link RoomService} owns the HTTP call, {@link RoomWsService}
 * owns the STOMP lifecycle, this component only orchestrates form state and presentation.
 */
@Component({
  selector: 'app-create-room',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, RoomBoardComponent],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss',
})
export class CreateRoomComponent implements OnDestroy {
  private readonly roomService = inject(RoomService);
  private readonly formBuilder = inject(FormBuilder);
  /** Injected (not wrapped) — its `status` signal is read directly from the template. */
  protected readonly roomWs = inject(RoomWsService);

  /**
   * Reactive form holding the room name, chosen deck, whether the facilitator also votes, and
   * their roster display name (E09 — classic parity).
   */
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    deck: ['FIBONACCI' as PokerDeck],
    facilitatorVotes: [true],
    facilitatorName: ['', [Validators.maxLength(FACILITATOR_NAME_MAX_LENGTH)]],
  });

  /** True while the creation request is in flight — disables the submit button. */
  protected readonly submitting = signal(false);

  /** i18n key of the current error, or `null` when there is none. */
  protected readonly errorMessageKey = signal<string | null>(null);

  /** The room just created, or `null` before the first successful submission. */
  protected readonly createdRoom = signal<RoomResponse | null>(null);

  /** i18n key of the invite-code clipboard-copy confirmation announcement, or `null`. */
  protected readonly copyAnnouncementKey = signal<string | null>(null);

  /** i18n key of the share-link clipboard-copy confirmation announcement, or `null`. */
  protected readonly shareUrlCopyAnnouncementKey = signal<string | null>(null);

  /**
   * The full shareable room URL for the created room (E09) — the join screen, sibling of this
   * page's route, with the invite code pre-filled as a `?code=` query parameter (consumed by
   * `JoinRoomComponent#ngOnInit`). `null` before a room is created. Derived from the current
   * page's own URL rather than a hardcoded module mount path, so it stays correct regardless of
   * where the shell mounts the agilité module.
   */
  protected readonly shareUrl = computed<string | null>(() => {
    const room = this.createdRoom();
    return room ? this.buildShareUrl(room.inviteCode) : null;
  });

  ngOnDestroy(): void {
    this.roomWs.disconnect();
  }

  /**
   * Submits the form. No-ops if the form is invalid or a request is already in flight —
   * marks all controls as touched so validation errors become visible. On success, opens the
   * room's STOMP connection ({@link RoomWsService.connect}) using the response's own
   * `wsTopic`/`accessToken` (US09.2.1) — the facilitator's own board (tickets/votes) works
   * without a separate join-by-code round trip.
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessageKey.set(null);

    const { name, deck, facilitatorVotes, facilitatorName } = this.form.getRawValue();
    const trimmedFacilitatorName = facilitatorName.trim();
    this.roomService
      .createRoom({
        name: name.trim(),
        deck,
        facilitatorVotes,
        ...(trimmedFacilitatorName ? { facilitatorName: trimmedFacilitatorName } : {}),
      })
      .subscribe({
        next: (room) => {
          this.submitting.set(false);
          this.createdRoom.set(room);
          this.form.reset();
          if (room.accessToken) {
            this.roomWs.connect(room.wsTopic, room.accessToken, room.id.toString());
          }
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessageKey.set(this.resolveErrorMessageKey(error));
        },
      });
  }

  /**
   * Resets the success view so the facilitator can create another room.
   */
  protected createAnother(): void {
    this.roomWs.disconnect();
    this.createdRoom.set(null);
    this.copyAnnouncementKey.set(null);
    this.shareUrlCopyAnnouncementKey.set(null);
  }

  /**
   * Copies the created room's invite code to the clipboard and announces the result for screen
   * reader users via {@link copyAnnouncementKey}.
   */
  protected copyInviteCode(): void {
    const room = this.createdRoom();
    if (!room) {
      return;
    }
    navigator.clipboard
      .writeText(room.inviteCode)
      .then(() => this.copyAnnouncementKey.set('scrumPoker.createRoom.copySuccess'))
      .catch(() => this.copyAnnouncementKey.set('scrumPoker.createRoom.copyError'));
  }

  /**
   * Copies the created room's full shareable URL ({@link shareUrl}) to the clipboard and
   * announces the result for screen reader users via {@link shareUrlCopyAnnouncementKey} — the
   * classic-parity alternative to reading the raw invite code aloud (E09).
   */
  protected copyShareUrl(): void {
    const url = this.shareUrl();
    if (!url) {
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => this.shareUrlCopyAnnouncementKey.set('scrumPoker.createRoom.shareUrlCopySuccess'))
      .catch(() => this.shareUrlCopyAnnouncementKey.set('scrumPoker.createRoom.shareUrlCopyError'));
  }

  /**
   * Builds the full shareable room URL: the current page's own origin/path with the trailing
   * `new` segment swapped for `join` (its sibling route, `JoinRoomComponent`) and the invite code
   * attached as a `?code=` query parameter. Derived from `window.location` rather than a
   * hardcoded module mount path (e.g. `/agilite`), so it stays correct regardless of where the
   * shell mounts this module — this component is only ever rendered at the `.../rooms/new` route,
   * so the trailing-segment swap is safe.
   *
   * @param inviteCode the created room's invite code
   * @returns the absolute, shareable join URL
   */
  private buildShareUrl(inviteCode: string): string {
    const joinPath = window.location.pathname.replace(/\/new$/, '/join');
    return `${window.location.origin}${joinPath}?code=${inviteCode}`;
  }

  /**
   * Maps an HTTP error to an i18n key, without leaking raw backend error text to the UI.
   *
   * @param error the HTTP error response
   * @returns the i18n key describing the error
   */
  private resolveErrorMessageKey(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'scrumPoker.createRoom.errors.unauthorized';
    }
    if (error.status === 400) {
      const body = error.error as ProblemDetailResponse | null;
      if (body?.code === 'INVALID_NAME') {
        return 'scrumPoker.createRoom.errors.invalidName';
      }
      return 'scrumPoker.createRoom.errors.invalidRequest';
    }
    return 'scrumPoker.createRoom.errors.generic';
  }
}
