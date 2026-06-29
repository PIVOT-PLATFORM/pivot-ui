import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'piv-legal-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <button class="back-link" type="button" (click)="goBack()">
          {{ 'legal.back' | transloco }}
        </button>

        @if (lang() === 'en') {
          <p class="legal-lang-notice">{{ 'legal.fr_only_notice' | transloco }}</p>
        }

        <h1>{{ 'legal.mentions_title' | transloco }}</h1>
        <p class="updated">Dernière mise à jour : juin 2026</p>

        <h2>1. Éditeur</h2>
        <p>
          La plateforme <strong>PIVOT Suite Collaborative</strong> est éditée par la société
          <strong>PIVOT SAS</strong>, société par actions simplifiée au capital de 10 000 €,
          immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro
          RCS Paris B 000 000 000, dont le siège social est situé à Paris, France.
        </p>
        <p>Directeur de la publication : le représentant légal de PIVOT SAS</p>
        <p>Contact : <a href="mailto:legal@pivot.app">legal&#64;pivot.app</a></p>

        <h2>2. Hébergement</h2>
        <p>
          La plateforme est hébergée sur des infrastructures cloud situées au sein de
          l'Union européenne, conformément au Règlement Général sur la Protection des
          Données (RGPD — Règlement UE 2016/679).
        </p>

        <h2>3. Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus présents sur la plateforme PIVOT (textes, graphismes,
          logotypes, icônes, sons, logiciels) sont la propriété exclusive de PIVOT SAS
          ou de ses partenaires et sont protégés par les lois françaises et internationales
          relatives à la propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication ou adaptation de
          tout ou partie des éléments de la plateforme, quel que soit le moyen ou le
          procédé utilisé, est interdite sauf autorisation écrite préalable de PIVOT SAS.
        </p>

        <h2>4. Limitation de responsabilité</h2>
        <p>
          PIVOT SAS s'efforce d'assurer l'exactitude et la mise à jour des informations
          diffusées sur la plateforme. Cependant, elle ne peut garantir l'exactitude,
          la complétude ou l'actualité des informations diffusées. En conséquence, PIVOT SAS
          décline toute responsabilité pour toute imprécision, inexactitude ou omission
          portant sur des informations disponibles sur la plateforme.
        </p>

        <h2>5. Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre
          <a href="/legal/confidentialite">Politique de confidentialité</a>.
          Conformément au RGPD, vous disposez de droits d'accès, de rectification,
          d'effacement et de portabilité de vos données.
          Pour exercer ces droits : <a href="mailto:dpo@pivot.app">dpo&#64;pivot.app</a>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          La plateforme utilise un cookie de session HTTP-only (<code>pivot_session</code>)
          strictement nécessaire à son fonctionnement. Aucun cookie publicitaire ou de
          traçage tiers n'est déposé sans votre consentement.
        </p>

        <h2>7. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont régies par le droit français.
          En cas de litige, les tribunaux compétents de Paris seront saisis.
        </p>

        <h2>Contact</h2>
        <p><a href="mailto:legal@pivot.app">legal&#64;pivot.app</a></p>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 24px;
      background: var(--surface-bg);
    }
    .legal-card {
      background: var(--surface-card);
      border-radius: 16px;
      padding: 48px;
      max-width: 760px;
      width: 100%;
      box-shadow: var(--shadow-md);
      @media (max-width: 600px) { padding: 28px 20px; }
    }
    .back-link {
      display: inline-block;
      margin-bottom: 28px;
      color: var(--color-brand-600);
      font-size: 0.875rem;
      font-weight: 500;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: none;
      &:hover { text-decoration: underline; }
      &:focus-visible { outline: 2px solid var(--color-brand-500); outline-offset: 2px; border-radius: 2px; }
    }
    .legal-lang-notice {
      font-size: 0.875rem;
      color: var(--color-warning, #b45309);
      background: rgba(251, 191, 36, 0.1);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 24px;
    }
    h1 { font-size: 1.75rem; font-weight: 700; color: var(--color-navy-900); margin-bottom: 4px; }
    .updated { font-size: 0.8rem; color: var(--color-gray-500); margin-bottom: 32px; }
    h2 { font-size: 1.1rem; font-weight: 600; color: var(--color-brand-700, #312e81); margin: 28px 0 10px; }
    p, li { font-size: 0.9375rem; color: var(--color-gray-700); line-height: 1.7; }
    ul { padding-left: 20px; }
    code { background: var(--surface-bg); padding: 1px 5px; border-radius: 3px; font-size: 0.85em; }
    a { color: var(--color-brand-600); }
  `]
})
export class LegalNoticeComponent {
  private readonly location = inject(Location);
  private readonly transloco = inject(TranslocoService);

  readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  goBack(): void { this.location.back(); }
}
