import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'piv-coming-soon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <div class="coming-soon">
      <svg class="coming-soon__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <h1 class="coming-soon__title">{{ 'coming_soon.title' | transloco }}</h1>
      <p class="coming-soon__subtitle">{{ 'coming_soon.subtitle' | transloco }}</p>
      <a routerLink="/" class="coming-soon__back">{{ 'coming_soon.back' | transloco }}</a>
    </div>
  `,
  styles: [`
    .coming-soon { max-width:480px; margin:80px auto; text-align:center; padding:0 24px; }
    .coming-soon__icon { width:56px; height:56px; color:var(--color-gray-300); margin:0 auto 24px; display:block; }
    .coming-soon__title { font-size:var(--text-xl); font-weight:700; color:var(--color-navy-900); margin:0 0 8px; }
    .coming-soon__subtitle { font-size:var(--text-sm); color:var(--color-gray-500); margin:0 0 32px; }
    .coming-soon__back { font-size:var(--text-sm); color:var(--color-brand-600); text-decoration:none; font-weight:500; &:hover { text-decoration:underline; } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; border-radius:2px; } }
  `],
})
export class ComingSoonComponent {}
