import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';
import { BingoProblemDetailResponse, bingoRoomIdFromTopic } from '../models/bingo.model';
import { BingoApiService } from '../services/bingo-api.service';

/** Exact join-code length accepted by the backend (AC-47.1.1-15). */
const CODE_LENGTH = 6;

/** Display name bounds accepted by an anonymous join (AC-47.1.1-17). */
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 30;

/** Router-navigation state handed to {@link BingoBoardComponent} on a successful create/join. */
export interface BingoJoinNavigationState {
  readonly roomId: string;
  readonly code: string | null;
  readonly status: string;
  readonly maxPlayers: number;
  readonly wsTopic: string;
  readonly accessToken: string;
  readonly role: string;
  readonly grid: unknown;
  readonly isAnonymous: boolean;
}

/**
 * "Join a Bingo room by code" form (AC-47.1.1-02/03/17, FE-01). A single join call handles both
 * the authenticated and anonymous flows — the backend resolves which one from the ambient bearer
 * token. The pseudonym field is only shown/required for an anonymous caller (authenticated join
 * ignores any supplied `displayName`, AC-47.1.1-17) — mirrors `SessionJoinComponent`'s shape,
 * adapted for the bingo-specific authenticated/anonymous field toggle FE-01 requires.
 */
@Component({
  selector: 'app-bingo-join',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './bingo-join.component.html',
  styleUrl: './bingo-join.component.scss',
})
export class BingoJoinComponent implements OnInit {
  private readonly bingoApi = inject(BingoApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bearerToken = inject(COLLABORATIF_BEARER_TOKEN);

  /** `true` when the caller has no PIVOT session at all — drives the pseudonym field (FE-01). */
  protected readonly isAnonymous = this.bearerToken() === null;

  protected readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(CODE_LENGTH), Validators.maxLength(CODE_LENGTH)]],
    displayName: [
      '',
      this.isAnonymous
        ? [Validators.required, Validators.minLength(DISPLAY_NAME_MIN_LENGTH), Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]
        : [],
    ],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessageKey = signal<string | null>(null);

  /** Pre-fills the code from a `?code=` query param (shared room link). */
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
    this.bingoApi
      .joinRoom({
        code: code.trim().toUpperCase(),
        displayName: this.isAnonymous ? displayName.trim() : undefined,
      })
      .subscribe({
        next: response => {
          this.submitting.set(false);
          const state: BingoJoinNavigationState = {
            roomId: response.roomId,
            code: response.code,
            status: response.status,
            maxPlayers: response.maxPlayers,
            wsTopic: response.wsTopic,
            accessToken: response.accessToken,
            role: response.role,
            grid: response.grid,
            isAnonymous: this.isAnonymous,
          };
          void this.router.navigate(['/bingo', bingoRoomIdFromTopic(response.wsTopic)], { state });
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessageKey.set(this.resolveErrorMessageKey(error));
        },
      });
  }

  /**
   * Maps a join failure to an i18n key. A 404 is deliberately generic — an unknown code, an
   * expired room and a finished room are indistinguishable server-side (AC-47.1.1-16,
   * anti-enumeration).
   */
  private resolveErrorMessageKey(error: HttpErrorResponse): string {
    if (error.status === 404) {
      return 'bingo.join.errors.notFound';
    }
    if (error.status === 400) {
      const body = error.error as BingoProblemDetailResponse | null;
      if (body?.code === 'INVALID_DISPLAY_NAME') {
        return 'bingo.join.errors.invalidDisplayName';
      }
      if (body?.code === 'INVALID_CODE') {
        return 'bingo.join.errors.invalidCode';
      }
      return 'bingo.join.errors.invalidRequest';
    }
    return 'bingo.join.errors.generic';
  }
}
