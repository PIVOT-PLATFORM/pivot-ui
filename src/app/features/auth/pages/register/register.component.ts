import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value || '';
  if (v.length < 12) return { weak: 'Minimum 12 caractères.' };
  if (!/[A-Z]/.test(v)) return { weak: 'Au moins une majuscule.' };
  if (!/[0-9]/.test(v)) return { weak: 'Au moins un chiffre.' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'Au moins un caractère spécial.' };
  return null;
}

@Component({
  selector: 'piv-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
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

  constructor(private fb: FormBuilder, private auth: AuthService) {}

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
          this.error.set('Trop de tentatives. Réessayez dans quelques minutes.');
        } else {
          this.error.set('Une erreur est survenue. Réessayez.');
        }
      },
    });
  }

  passwordStrength(): { label: string; color: string; width: string } {
    const v = this.form.value.password || '';
    let score = 0;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    if (v.length >= 20) score++;

    const levels = [
      { label: '', color: 'transparent', width: '0%' },
      { label: 'Très faible', color: '#DC2626', width: '20%' },
      { label: 'Faible', color: '#F59E0B', width: '40%' },
      { label: 'Moyen', color: '#EAB308', width: '60%' },
      { label: 'Fort', color: '#22C55E', width: '80%' },
      { label: 'Très fort', color: '#15803D', width: '100%' },
    ];
    return levels[score] || levels[0];
  }
}
