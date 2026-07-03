import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { environment } from '../../../../environments/environment';

/**
 * Politique de robustesse des mots de passe — miroir exact du backend
 * (`GET /api/auth/password-policy`, propriétés `security.password.*`).
 */
export interface PasswordPolicy {
  minLength: number;
  minUppercase: number;
  minDigits: number;
  minSpecial: number;
}

/**
 * Valeurs par défaut identiques à celles du backend — utilisées comme fallback
 * si l'endpoint policy est injoignable (le backend reste l'autorité : un mot de
 * passe non conforme sera de toute façon rejeté en 400 à l'inscription).
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  minUppercase: 1,
  minDigits: 1,
  minSpecial: 1,
};

/** État de chaque critère de la politique pour un mot de passe donné. */
export interface PasswordCriteria {
  minLength: boolean;
  uppercase: boolean;
  digit: boolean;
  special: boolean;
}

/** Niveau de force affiché : faible / moyen / fort. */
export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

const UPPERCASE_RE = /\p{Lu}/u;
const DIGIT_RE = /\p{Nd}/u;
const SPECIAL_RE = /[^\p{L}\p{Nd}]/u;

/** Marge de longueur au-delà de `minLength` pour passer de « Moyen » à « Fort ». */
const STRONG_EXTRA_LENGTH = 4;

/**
 * Service de politique de mot de passe (US01.2.4).
 *
 * - Charge la politique **une seule fois** depuis le backend (aucun appel API à la frappe) ;
 *   la validation temps réel est purement locale.
 * - Expose l'évaluation des critères et le niveau de force — logique métier hors composants.
 *
 * Classification Unicode alignée sur le backend (`Character.isUpperCase` / `isDigit` /
 * `!isLetterOrDigit`) : majuscule = `\p{Lu}`, chiffre = `\p{Nd}`, spécial = ni lettre ni chiffre.
 * La longueur est mesurée en unités UTF-16 (`String.length`), comme côté Java.
 */
@Injectable({ providedIn: 'root' })
export class PasswordPolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _policy = signal<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);
  private loadRequested = false;

  /** Politique courante (défauts tant que le backend n'a pas répondu). */
  readonly policy = this._policy.asReadonly();

  /**
   * Charge la politique depuis le backend — idempotent : un seul appel HTTP
   * quel que soit le nombre de composants consommateurs. En cas d'erreur réseau,
   * les défauts (identiques au backend) restent en vigueur.
   */
  load(): void {
    if (this.loadRequested) return;
    this.loadRequested = true;
    this.http.get<PasswordPolicy>(`${this.apiUrl}/auth/password-policy`).subscribe({
      next: (policy) => this._policy.set(policy),
      error: () => {
        /* fallback silencieux sur DEFAULT_PASSWORD_POLICY — le backend reste l'autorité */
      },
    });
  }

  /**
   * Évalue chaque critère de la politique pour le mot de passe donné.
   *
   * @param password mot de passe saisi
   * @param policy politique à appliquer (défaut : politique courante)
   * @returns état individuel de chaque critère
   */
  evaluate(password: string, policy: PasswordPolicy = this._policy()): PasswordCriteria {
    let uppercase = 0;
    let digit = 0;
    let special = 0;
    for (const ch of password) {
      if (UPPERCASE_RE.test(ch)) uppercase++;
      else if (DIGIT_RE.test(ch)) digit++;
      else if (SPECIAL_RE.test(ch)) special++;
    }
    return {
      minLength: password.length >= policy.minLength,
      uppercase: uppercase >= policy.minUppercase,
      digit: digit >= policy.minDigits,
      special: special >= policy.minSpecial,
    };
  }

  /**
   * Vérifie que tous les critères de la politique sont satisfaits.
   *
   * @param password mot de passe saisi
   * @param policy politique à appliquer (défaut : politique courante)
   * @returns `true` si le mot de passe respecte l'intégralité de la politique
   */
  isCompliant(password: string, policy: PasswordPolicy = this._policy()): boolean {
    const c = this.evaluate(password, policy);
    return c.minLength && c.uppercase && c.digit && c.special;
  }

  /**
   * Niveau de force affiché à l'utilisateur :
   * - `weak` — au moins un critère de la politique non satisfait ;
   * - `medium` — politique satisfaite ;
   * - `strong` — politique satisfaite et longueur ≥ `minLength + 4`.
   *
   * @param password mot de passe saisi
   * @param policy politique à appliquer (défaut : politique courante)
   * @returns niveau de force, ou `null` si le champ est vide
   */
  strengthLevel(
    password: string,
    policy: PasswordPolicy = this._policy(),
  ): PasswordStrengthLevel | null {
    if (!password) return null;
    if (!this.isCompliant(password, policy)) return 'weak';
    return password.length >= policy.minLength + STRONG_EXTRA_LENGTH ? 'strong' : 'medium';
  }

  /**
   * Validateur de formulaire réactif appliquant la politique courante.
   * La closure lit le signal de politique à chaque validation — si la politique
   * arrive après la saisie, appeler `updateValueAndValidity()` (cf. effect composant).
   *
   * @returns validateur retournant `{ passwordPolicy: true }` si non conforme
   */
  validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value: string = control.value ?? '';
      if (!value) return null; // Validators.required gère le champ vide
      return this.isCompliant(value) ? null : { passwordPolicy: true };
    };
  }
}
