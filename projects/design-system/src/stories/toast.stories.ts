import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { Component, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoModule, provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ToastComponent } from '../components/toast/toast.component';
import { ToastService } from '../components/toast/toast.service';

@Injectable({ providedIn: 'root' })
class StoryTranslocoLoader implements TranslocoLoader {
  getTranslation(_lang: string): Observable<Record<string, string>> {
    return of({
      'auth.session.expired': 'Session expirée, veuillez vous reconnecter.',
      'common.close': 'Fermer',
      'modules.guard.disabled': 'Module {module} non disponible.',
      'modules.guard.adminLink': 'Gérer les modules',
    });
  }
}

@Component({
  selector: 'pivot-ds-toast-demo',
  standalone: true,
  imports: [ToastComponent, TranslocoModule],
  template: `
    <div class="toast-demo">
      <h3 class="toast-demo__title">Toast Container Demo</h3>
      <div class="toast-demo__actions">
        <button class="btn btn-secondary" (click)="showInfo()">Info toast</button>
        <button class="btn btn-secondary" (click)="showWarning()">Warning toast</button>
        <button class="btn btn-danger" (click)="showError()">Error toast</button>
      </div>
      <pivot-ds-toast-container></pivot-ds-toast-container>
    </div>
  `,
  styles: [`
    .toast-demo { padding: 24px; font-family: var(--font-sans); min-height: 200px; }
    .toast-demo__title { margin-bottom: 16px; color: var(--color-gray-900); }
    .toast-demo__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  `],
})
class ToastDemoComponent {
  private readonly toastService = inject(ToastService);

  showInfo(): void { this.toastService.show('common.close', 'info'); }
  showWarning(): void { this.toastService.show('auth.session.expired', 'warning'); }
  showError(): void { this.toastService.show('auth.session.expired', 'error'); }
}

const meta: Meta<ToastDemoComponent> = {
  title: 'Design System/Components/Toast',
  component: ToastDemoComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['fr'], defaultLang: 'fr', reRenderOnLangChange: false },
          loader: StoryTranslocoLoader,
        }),
      ],
    }),
    moduleMetadata({ imports: [ToastComponent, TranslocoModule] }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Conteneur global de toasts du shell PIVOT.

- \`role="alert"\` sur chaque toast (annonce ARIA immédiate)
- Clés Transloco — jamais de libellé en dur
- Auto-dismiss après 8s, fermeture manuelle via le bouton ×
- Types : \`info\`, \`warning\`, \`error\`
- EN17.8 — copie incubée depuis \`src/app/shared/toast\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ToastDemoComponent>;

export const Interactive: Story = {
  name: 'Interactive (cliquer pour afficher des toasts)',
};
