import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription, interval, switchMap } from 'rxjs';
import { JoinSessionResponse, ProblemDetailResponse } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/** Exact join-code length accepted by the backend (US19.1.1's `JoinCodeGenerator`). */
const CODE_LENGTH = 6;

/** Maximum display name length accepted by the backend (US19.2.1). */
const DISPLAY_NAME_MAX_LENGTH = 40;

/**
 * Heartbeat interval — a comfortable margin under the backend's guest-session TTL. Sent
 * regardless of whether the caller joined authenticated or as `ROLE_GUEST` (the backend contract
 * treats it as a no-op for an authenticated participant, US19.2.1's heartbeat AC scopes the
 * *requirement* to guests, not the *call itself*) since this component has no reliable,
 * library-independent way to know which flow the backend resolved without depending on a
 * concrete `AuthService` — see `collaboratif-ui`'s own architecture notes on that seam.
 */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

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
export class SessionJoinComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly sessionWs = inject(SessionWsService);

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(CODE_LENGTH), Validators.maxLength(CODE_LENGTH)]],
    displayName: ['', [Validators.required, Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessageKey = signal<string | null>(null);

  private heartbeatSubscription: Subscription | null = null;

  /** Pre-fills the code from a `?code=` query param (shared session link). */
  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.form.controls.code.setValue(code.trim().toUpperCase().slice(0, CODE_LENGTH));
    }
  }

  ngOnDestroy(): void {
    this.sessionWs.disconnect();
    this.stopHeartbeat();
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
          this.sessionWs.connect(response.wsTopic, response.token);
          this.startHeartbeat(response);
          void this.router.navigate(['/session', response.sessionId, 'play']);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessageKey.set(this.resolveErrorMessageKey(error));
        },
      });
  }

  private startHeartbeat(response: JoinSessionResponse): void {
    this.stopHeartbeat();
    this.heartbeatSubscription = interval(HEARTBEAT_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.sessionApi.guestHeartbeat(response.sessionId, response.participantId, {
            token: response.token,
          }),
        ),
      )
      .subscribe({
        error: () => {
          this.sessionWs.disconnect();
          this.errorMessageKey.set('session.join.errors.sessionExpired');
        },
      });
  }

  private stopHeartbeat(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = null;
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
