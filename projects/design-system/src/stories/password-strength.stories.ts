import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TranslocoModule, provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PasswordStrengthComponent } from '../components/password-strength/password-strength.component';
import { DESIGN_SYSTEM_API_URL } from '../components/password-strength/password-policy.service';

@Injectable({ providedIn: 'root' })
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(_lang: string): Observable<Record<string, string>> {
    return of({
      'auth.password.strength.label': 'Robustesse :',
      'auth.password.strength.weak': 'Faible',
      'auth.password.strength.medium': 'Moyen',
      'auth.password.strength.strong': 'Fort',
      'auth.password.strength.criteria.min_length': 'Au moins {count} caractères',
      'auth.password.strength.criteria.uppercase': 'Au moins {count} majuscule',
      'auth.password.strength.criteria.digit': 'Au moins {count} chiffre',
      'auth.password.strength.criteria.special': 'Au moins {count} caractère spécial',
      'auth.password.strength.criteria_met': 'validé',
      'auth.password.strength.criteria_not_met': 'non validé',
    });
  }
}

@Component({
  selector: 'pivot-ds-password-demo',
  standalone: true,
  imports: [PasswordStrengthComponent, TranslocoModule],
  template: `
    <div class="password-demo">
      <h3 class="password-demo__title">PasswordStrength Demo</h3>
      <input
        type="password"
        class="form-control password-demo__input"
        placeholder="Saisissez un mot de passe…"
        (input)="password.set($any($event.target).value)"
      />
      <pivot-ds-password-strength [password]="password()" />
    </div>
  `,
  styles: [`
    .password-demo { padding: 24px; max-width: 400px; font-family: var(--font-sans); }
    .password-demo__title { margin-bottom: 16px; color: var(--color-gray-900); }
    .password-demo__input { margin-bottom: 8px; }
  `],
})
class PasswordDemoComponent {
  readonly password = signal('');
}

const meta: Meta<PasswordDemoComponent> = {
  title: 'Design System/Components/PasswordStrength',
  component: PasswordDemoComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(withFetch()),
        provideTransloco({
          config: { availableLangs: ['fr'], defaultLang: 'fr', reRenderOnLangChange: false },
          loader: StoryTranslocoLoader,
        }),
        { provide: DESIGN_SYSTEM_API_URL, useValue: '' }, // pas d'API en Storybook, défauts utilisés
      ],
    }),
    moduleMetadata({ imports: [PasswordStrengthComponent, TranslocoModule] }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Indicateur de robustesse du mot de passe (US01.2.4).

- Barre de force + texte du niveau (WCAG 1.4.1 — pas uniquement par couleur)
- Checklist des critères de la politique backend
- \`aria-live="polite"\` pour annonce SR en temps réel
- \`DESIGN_SYSTEM_API_URL\` token requis pour charger la politique backend
- EN17.8 — version lib indépendante de \`app/core/auth/service/password-policy.service\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<PasswordDemoComponent>;

export const Interactive: Story = {
  name: 'Interactive (saisir un mot de passe)',
};
