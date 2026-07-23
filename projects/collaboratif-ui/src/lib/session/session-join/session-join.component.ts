import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProblemDetailResponse, sessionIdFromTopic } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';

/** Exact join-code length accepted by the backend (US19.1.1's `JoinCodeGenerator`). */
const CODE_LENGTH = 6;

/** Maximum display name length accepted by the backend (US19.2.1). */
const DISPLAY_NAME_MAX_LENGTH = 40;

/**
 * Router-navigation state handed to {@link SessionParticipantShellComponent} on a successful
 * join — the WS connection and (guest-only) heartbeat are owned by the shell, not this
 * component, so they survive past this component's destruction on navigation. See
 * `session-participant-shell.component.ts`'s TSDoc for why: an earlier draft had this component
 * call `SessionWsService.connect()`/start the heartbeat itself, then immediately tear both down
 * again in its own `ngOnDestroy()` the instant `router.navigate()` succeeded — the live
 * connection never actually survived to reach the page meant to use it.
 */
export interface SessionJoinNavigationState {
  readonly participantId: string;
  /** `null` for an authenticated join — the shell then connects with the caller's bearer token. */
  readonly guestToken: string | null;
}

/**
 * "Join a live session by code" form (US19.2.1) — a single join call handles both the
 * authenticated and anonymous (`ROLE_GUEST`) flows: the backend resolves which one from the
 * ambient bearer token, this component never chooses a mode explicitly (unlike scrum-poker's
 * `JoinRoomComponent`, which exposes two distinct backend endpoints).
 */
@Component({
  selector: 'app-session-join',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './session-join.component.html',
  styleUrl: './session-join.component.scss',
})
export class SessionJoinComponent implements OnInit {
  private readonly sessionApi = inject(SessionApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(CODE_LENGTH), Validators.maxLength(CODE_LENGTH)]],
    displayName: ['', [Validators.required, Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessageKey = signal<string | null>(null);

  /** Pre-fills the code from a `?code=` query param (shared session link). */
  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.form.controls.code.setValue(code.trim().toUpperCase().slice(0, CODE_LENGTH));
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessageKey.set(null);

    const { code, displayName } = this.form.getRawValue();
    this.sessionApi
      .joinSession({ code: code.trim().toUpperCase(), displayName: displayName.trim() })
      .subscribe({
        next: response => {
          this.submitting.set(false);
          const sessionId = sessionIdFromTopic(response.wsTopic);
          const state: SessionJoinNavigationState = {
            participantId: response.participantId,
            guestToken: response.token,
          };
          void this.router.navigate(['/session', sessionId, 'play'], { state });
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessageKey.set(this.resolveErrorMessageKey(error));
        },
      });
  }

  /**
   * Maps a join failure to an i18n key. A 404 is deliberately generic — an unknown code and a
   * `COMPLETED` session's code are indistinguishable server-side (US19.2.1 anti-enumeration AC).
   */
  private resolveErrorMessageKey(error: HttpErrorResponse): string {
    if (error.status === 404) {
      return 'session.join.errors.notFound';
    }
    if (error.status === 400) {
      const body = error.error as ProblemDetailResponse | null;
      if (body?.code === 'INVALID_DISPLAY_NAME') {
        return 'session.join.errors.invalidDisplayName';
      }
      return 'session.join.errors.invalidRequest';
    }
    return 'session.join.errors.generic';
  }
}
