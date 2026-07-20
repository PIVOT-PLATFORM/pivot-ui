import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { BoardService } from '../../core/whiteboard/board.service';
import { ToastService } from '../../core/toast/toast.service';
import { BoardMember, ShareToken } from '../../core/whiteboard/board.model';

/**
 * Panel component for board sharing and member management (US08.2.3, US08.2.5).
 *
 * Supports: inviting a member by e-mail (upserts their role), generating an
 * invitation link, copying it to the clipboard, listing members with their
 * roles, changing a member's role, and revoking a member with a confirmation
 * dialog.
 *
 * Must be used inside a `role="dialog" aria-modal="true"` host to satisfy
 * the A11y focus-trap requirement.
 */
@Component({
  selector: 'app-share-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, DatePipe, SlicePipe],
  templateUrl: './share-panel.component.html',
  styleUrl: './share-panel.component.scss',
})
export class SharePanelComponent implements OnInit {
  /** Board whose members and share links are managed by this panel. */
  readonly boardId = input.required<string>();

  /** Emitted when the user closes the panel (Escape or close button). */
  readonly closed = output<void>();

  private readonly boardService = inject(BoardService);
  private readonly toast = inject(ToastService);

  protected readonly members = signal<BoardMember[]>([]);
  protected readonly membersStatus = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly shareToken = signal<ShareToken | null>(null);
  protected readonly tokenStatus = signal<'idle' | 'generating' | 'error'>('idle');
  protected readonly selectedRole = signal<'EDITOR' | 'VIEWER'>('EDITOR');
  protected readonly linkCopied = signal(false);
  protected readonly clipboardFailed = signal(false);
  protected readonly confirmRemoveMember = signal<BoardMember | null>(null);
  protected readonly updatingRoleForUserId = signal<number | null>(null);
  protected readonly removingMemberId = signal<number | null>(null);
  protected readonly inviteEmail = signal('');
  protected readonly inviteRole = signal<'EDITOR' | 'VIEWER'>('EDITOR');
  protected readonly inviteStatus = signal<'idle' | 'sending' | 'error'>('idle');

  protected readonly shareLink = computed(() => this.shareToken()?.shareLink ?? null);

  ngOnInit(): void {
    this.loadMembers();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected setSelectedRole(event: Event): void {
    this.selectedRole.set((event.target as HTMLSelectElement).value as 'EDITOR' | 'VIEWER');
  }

  protected setInviteEmail(event: Event): void {
    this.inviteEmail.set((event.target as HTMLInputElement).value);
  }

  protected setInviteRole(event: Event): void {
    this.inviteRole.set((event.target as HTMLSelectElement).value as 'EDITOR' | 'VIEWER');
  }

  /**
   * Invites a user by e-mail with the selected role (US08.2.5). Upserts the member list on
   * success — a brand-new invitee is appended, a re-invited existing member's row is updated
   * in place. Errors are mapped to a precise toast via {@link inviteErrorKey} rather than a
   * single generic message, since the backend's failure modes (unknown e-mail, self-invite,
   * non-owner caller) each need a different explanation for the user to act on.
   */
  protected submitInvite(): void {
    const email = this.inviteEmail().trim();
    if (!email || this.inviteStatus() === 'sending') return;

    this.inviteStatus.set('sending');
    this.boardService.inviteMember(this.boardId(), email, this.inviteRole()).subscribe({
      next: member => {
        this.upsertMember(member);
        this.inviteStatus.set('idle');
        this.inviteEmail.set('');
        this.toast.show('whiteboard.share.panel.invite.success', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.inviteStatus.set('error');
        this.toast.show(this.inviteErrorKey(err), 'error');
      },
    });
  }

  protected generateLink(): void {
    this.tokenStatus.set('generating');
    this.boardService.generateShareToken(this.boardId(), this.selectedRole()).subscribe({
      next: token => {
        this.shareToken.set(token);
        this.tokenStatus.set('idle');
        this.clipboardFailed.set(false);
      },
      error: () => {
        this.tokenStatus.set('error');
        this.toast.show('whiteboard.share.panel.generateError', 'error');
      },
    });
  }

  protected copyLink(): void {
    const link = this.shareLink();
    if (!link) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(
        () => {
          this.linkCopied.set(true);
          setTimeout(() => this.linkCopied.set(false), 2000);
        },
        () => this.clipboardFailed.set(true),
      );
    } else {
      this.clipboardFailed.set(true);
    }
  }

  protected onRoleChange(member: BoardMember, event: Event): void {
    const newRole = (event.target as HTMLSelectElement).value as 'EDITOR' | 'VIEWER';
    this.updatingRoleForUserId.set(member.userId);
    this.boardService.updateMemberRole(this.boardId(), member.userId, newRole).subscribe({
      next: updated => {
        this.members.update(list =>
          list.map(m => (m.userId === member.userId ? { ...m, role: updated.role } : m)),
        );
        this.updatingRoleForUserId.set(null);
      },
      error: () => {
        this.updatingRoleForUserId.set(null);
        this.toast.show('whiteboard.share.panel.roleUpdateError', 'error');
        /* Force signal re-read so the select resets to the server value */
        this.members.update(list => [...list]);
      },
    });
  }

  protected startRemove(member: BoardMember): void {
    this.confirmRemoveMember.set(member);
  }

  protected cancelRemove(): void {
    this.confirmRemoveMember.set(null);
  }

  protected confirmRemove(member: BoardMember): void {
    this.removingMemberId.set(member.userId);
    this.boardService.removeMember(this.boardId(), member.userId).subscribe({
      next: () => {
        this.members.update(list => list.filter(m => m.userId !== member.userId));
        this.removingMemberId.set(null);
        this.confirmRemoveMember.set(null);
      },
      error: () => {
        this.removingMemberId.set(null);
        this.toast.show('whiteboard.share.panel.removeError', 'error');
      },
    });
  }

  private loadMembers(): void {
    this.membersStatus.set('loading');
    this.boardService.listMembers(this.boardId()).subscribe({
      next: list => {
        this.members.set(list);
        this.membersStatus.set('loaded');
      },
      error: () => {
        this.membersStatus.set('error');
      },
    });
  }

  /** Appends a brand-new member, or replaces an existing one in place (invite upsert). */
  private upsertMember(member: BoardMember): void {
    this.members.update(list => {
      const index = list.findIndex(m => m.userId === member.userId);
      if (index === -1) return [...list, member];
      const copy = [...list];
      copy[index] = member;
      return copy;
    });
  }

  /**
   * Maps a `POST /whiteboard/boards/{boardId}/members` failure to a precise i18n key, using
   * the backend's machine-readable `code` property (RFC 7807 `ProblemDetail`) when present.
   */
  private inviteErrorKey(err: HttpErrorResponse): string {
    const code = (err.error as { code?: string } | null)?.code;
    switch (code) {
      case 'INVITEE_NOT_FOUND':
        return 'whiteboard.share.panel.invite.errorNotFound';
      case 'SELF_INVITE':
        return 'whiteboard.share.panel.invite.errorSelf';
      case 'INVALID_EMAIL':
        return 'whiteboard.share.panel.invite.errorInvalidEmail';
      default:
        return err.status === 403
          ? 'whiteboard.share.panel.invite.errorForbidden'
          : 'whiteboard.share.panel.invite.errorGeneric';
    }
  }
}
