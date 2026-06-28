/**
 * HomeComponent — landing page for authenticated users.
 *
 * Shows a greeting, the grid of active modules, coming-soon cards,
 * and an empty state when no module is configured yet.
 *
 * Accessibility: landmark <main>, h1/h2 heading hierarchy, skeleton
 * uses aria-busy + aria-label, interactive cards have visible focus ring.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/service/auth.service';
import { ModuleRegistryService } from '../../core/modules/module-registry.service';
import type { PivotModuleUi } from '../../core/modules/module.model';

@Component({
  selector: 'piv-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="home" aria-label="Accueil">

      <!-- ─── Greeting ─── -->
      <section class="home__greeting" aria-labelledby="greeting-heading">
        <h1 id="greeting-heading" class="home__greeting-title">
          Bonjour, {{ user()?.firstName ?? user()?.email ?? 'vous' }}&nbsp;👋
        </h1>
        <p class="home__greeting-sub">
          Vos outils collaboratifs, au même endroit.
        </p>
      </section>

      <!-- ─── Skeleton ─── -->
      @if (loading()) {
        <section
          class="modules-section"
          aria-busy="true"
          aria-label="Chargement des modules en cours"
        >
          <h2 class="modules-section__title">Vos modules</h2>
          <div class="modules-grid" role="list">
            @for (i of skeletonItems; track i) {
              <div class="module-card module-card--skeleton" role="listitem" aria-hidden="true">
                <div class="module-card__skeleton-icon"></div>
                <div class="module-card__skeleton-line module-card__skeleton-line--title"></div>
                <div class="module-card__skeleton-line module-card__skeleton-line--desc"></div>
                <div class="module-card__skeleton-line module-card__skeleton-line--cta"></div>
              </div>
            }
          </div>
        </section>
      }

      @if (!loading()) {

        <!-- ─── Active modules ─── -->
        @if (activeModules().length > 0) {
          <section class="modules-section" aria-labelledby="active-modules-heading">
            <h2 id="active-modules-heading" class="modules-section__title">Vos modules</h2>
            <div class="modules-grid" role="list">
              @for (mod of activeModules(); track mod.id) {
                <a
                  [routerLink]="mod.route"
                  class="module-card module-card--active"
                  role="listitem"
                  [attr.aria-label]="'Ouvrir ' + mod.name"
                >
                  <div
                    class="module-card__icon"
                    [style.background]="hexToRgba(mod.color, 0.1)"
                    [style.color]="mod.color"
                    [innerHTML]="mod.icon"
                    aria-hidden="true"
                  ></div>
                  <div class="module-card__body">
                    <p class="module-card__name">{{ mod.name }}</p>
                    <p class="module-card__desc">{{ mod.description }}</p>
                  </div>
                  <span class="module-card__cta" aria-hidden="true">Ouvrir →</span>
                </a>
              }
            </div>
          </section>
        }

        <!-- ─── Empty state ─── -->
        @if (activeModules().length === 0 && comingSoonModules().length > 0) {
          <div class="home__empty" role="status">
            <svg class="home__empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 9h.01M15 9h.01M9 15h6"/>
            </svg>
            <p class="home__empty-text">
              Aucun module activé pour l'instant.
              L'administrateur peut activer des modules depuis le panneau d'administration.
            </p>
          </div>
        }

        <!-- ─── Fully empty state (no modules at all) ─── -->
        @if (activeModules().length === 0 && comingSoonModules().length === 0) {
          <div class="home__empty" role="status">
            <svg class="home__empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 9h.01M15 9h.01M9 15h6"/>
            </svg>
            <p class="home__empty-text">
              Aucun module disponible pour l'instant.
              Contactez votre administrateur.
            </p>
          </div>
        }

        <!-- ─── Coming-soon modules ─── -->
        @if (comingSoonModules().length > 0) {
          <section class="modules-section" aria-labelledby="coming-soon-heading">
            <h2 id="coming-soon-heading" class="modules-section__title">Modules à venir</h2>
            <div class="modules-grid" role="list">
              @for (mod of comingSoonModules(); track mod.id) {
                <div
                  class="module-card module-card--coming-soon"
                  role="listitem"
                  [attr.aria-label]="mod.name + ' — bientôt disponible'"
                  aria-disabled="true"
                >
                  <div
                    class="module-card__icon"
                    aria-hidden="true"
                    [innerHTML]="mod.icon"
                  ></div>
                  <div class="module-card__body">
                    <p class="module-card__name">{{ mod.name }}</p>
                    <p class="module-card__desc">{{ mod.description }}</p>
                  </div>
                  <span class="module-card__badge">À VENIR</span>
                </div>
              }
            </div>
          </section>
        }
      }

    </main>
  `,
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly moduleRegistry = inject(ModuleRegistryService);

  readonly user = this.auth.currentUser;
  readonly activeModules = this.moduleRegistry.activeModules;
  readonly comingSoonModules = this.moduleRegistry.comingSoonModules;
  readonly loading = signal(true);

  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    this.moduleRegistry.loadModules().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  readonly _moduleType!: PivotModuleUi;
}
