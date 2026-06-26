import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value || '';
  if (v.length < 12) return { weak: 'auth.register.password.min_length' };
  if (!/[A-Z]/.test(v)) return { weak: 'auth.register.password.need_uppercase' };
  if (!/\d/.test(v)) return { weak: 'auth.register.password.need_number' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'auth.register.password.need_special' };
  return null;
}

@Component({
  selector: 'piv-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPassword]],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  showPassword = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.register({
      firstName: this.form.value.firstName!,
      lastName: this.form.value.lastName!,
      email: this.form.value.email!,
      password: this.form.value.password!,
    }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // RGPD: same message whether email exists or not
        if (err.status === 409 || err.status === 400) {
          this.success.set(true);
        } else if (err.status === 429) {
          this.error.set('auth.login.error_rate_limit');
        } else {
          this.error.set('common.error_generic');
        }
      },
    });
  }

  passwordStrength(): { labelKey: string; color: string; width: string } {
    const v = this.form.value.password || '';
    let score = 0;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    if (v.length >= 20) score++;

    const levels = [
      { labelKey: '', color: 'transparent', width: '0%' },
      { labelKey: 'auth.register.strength.very_weak', color: '#DC2626', width: '20%' },
      { labelKey: 'auth.register.strength.weak', color: '#F59E0B', width: '40%' },
      { labelKey: 'auth.register.strength.medium', color: '#EAB308', width: '60%' },
      { labelKey: 'auth.register.strength.strong', color: '#22C55E', width: '80%' },
      { labelKey: 'auth.register.strength.very_strong', color: '#15803D', width: '100%' },
    ];
    return levels[score] || levels[0];
  }
}
