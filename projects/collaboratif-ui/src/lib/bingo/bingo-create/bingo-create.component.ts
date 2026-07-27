import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { bingoRoomIdFromTopic } from '../models/bingo.model';
import { BingoApiService } from '../services/bingo-api.service';
import { BingoJoinNavigationState } from '../bingo-join/bingo-join.component';

const NAME_MAX_LENGTH = 80;

/**
 * "Create a Bingo room" form (AC-47.1.1-01) — authenticated only; a missing/invalid bearer token
 * is rejected with HTTP 401 by the backend before the form ever submits successfully. The
 * creator becomes the room's first player immediately (their own grid is generated server-side)
 * and is routed straight to the board, same navigation contract as {@link BingoJoinComponent}.
 */
@Component({
  selector: 'app-bingo-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './bingo-create.component.html',
  styleUrl: './bingo-create.component.scss',
})
export class BingoCreateComponent {
  private readonly bingoApi = inject(BingoApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessageKey = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessageKey.set(null);

    this.bingoApi.createRoom({ name: this.form.getRawValue().name.trim() }).subscribe({
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
          isAnonymous: false,
        };
        void this.router.navigate(['/bingo', bingoRoomIdFromTopic(response.wsTopic)], { state });
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessageKey.set('bingo.create.errors.generic');
      },
    });
  }
}
