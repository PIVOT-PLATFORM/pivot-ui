import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'piv-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <button class="back-link" type="button" (click)="goBack()">← Retour</button>

        @if (lang() === 'en') {
          <p class="legal-lang-notice">⚠ This document is legally binding in French only.</p>
        }

        <h1>Politique de confidentialité</h1>
        <p class="updated">Dernière mise à jour : juin 2026 — Conforme RGPD (Règlement UE 2016/679)</p>

        <h2>1. Responsable du traitement</h2>
        <p>
          <strong>PIVOT SAS</strong>, Paris, France.<br/>
          Délégué à la protection des données (DPO) : <a href="mailto:dpo@pivot.app">dpo&#64;pivot.app</a>
        </p>

        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation de la plateforme PIVOT, nous collectons :</p>
        <ul>
          <li><strong>Données d'identification</strong> : prénom, nom, adresse email.</li>
          <li><strong>Données de connexion</strong> : adresse IP, user-agent, horodatage des connexions, empreinte d'appareil.</li>
          <li><strong>Données d'usage</strong> : actions réalisées sur la plateforme (journaux d'audit RGPD Art. 30).</li>
          <li><strong>Données techniques</strong> : tokens de session (stockés de manière sécurisée, jamais en clair).</li>
        </ul>
        <p>Nous ne collectons <strong>pas</strong> de données sensibles au sens de l'article 9 du RGPD.</p>

        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li><strong>Exécution du contrat</strong> (Art. 6.1.b RGPD) : fourniture du service, authentification, gestion de compte.</li>
          <li><strong>Obligation légale</strong> (Art. 6.1.c RGPD) : journaux d'audit, obligations comptables.</li>
          <li><strong>Intérêt légitime</strong> (Art. 6.1.f RGPD) : sécurité de la plateforme, détection de fraude, amélioration du service.</li>
          <li><strong>Consentement</strong> (Art. 6.1.a RGPD) : communications marketing (opt-in).</li>
        </ul>

        <h2>4. Durée de conservation</h2>
        <ul>
          <li>Données de compte actif : durée de la relation contractuelle + 3 ans.</li>
          <li>Journaux d'audit : 1 an glissant.</li>
          <li>Tokens de session : jusqu'à leur expiration ou révocation.</li>
          <li>Données après suppression de compte (soft-delete) : 30 jours avant purge définitive.</li>
        </ul>

        <h2>5. Sécurité des données</h2>
        <p>
          PIVOT met en œuvre les mesures techniques et organisationnelles appropriées pour
          garantir la sécurité des données personnelles :
        </p>
        <ul>
          <li>Chiffrement des mots de passe (BCrypt-12).</li>
          <li>Tokens de session opaques SHA-256 — jamais stockés en clair.</li>
          <li>Transport chiffré TLS 1.3.</li>
          <li>Isolation tenant stricte — aucune fuite de données inter-tenants.</li>
          <li>Journalisation des événements de sécurité (Art. 30 RGPD).</li>
        </ul>

        <h2>6. Partage des données</h2>
        <p>
          Les données personnelles ne sont ni vendues, ni louées à des tiers. Elles peuvent
          être communiquées à des sous-traitants techniques (hébergeur cloud, prestataire
          email transactionnel) dans le strict cadre de l'exécution du service, sous couvert
          d'un contrat de sous-traitance RGPD.
        </p>

        <h2>7. Transferts hors UE</h2>
        <p>
          Les données sont hébergées et traitées exclusivement au sein de l'Union européenne.
          Aucun transfert hors UE n'est effectué sans garanties appropriées (clauses
          contractuelles types, décision d'adéquation).
        </p>

        <h2>8. Vos droits</h2>
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Droit d'accès</strong> à vos données personnelles.</li>
          <li><strong>Droit de rectification</strong> en cas d'inexactitude.</li>
          <li><strong>Droit à l'effacement</strong> (« droit à l'oubli ») Art. 17.</li>
          <li><strong>Droit à la limitation</strong> du traitement.</li>
          <li><strong>Droit à la portabilité</strong> de vos données.</li>
          <li><strong>Droit d'opposition</strong> au traitement basé sur l'intérêt légitime.</li>
          <li><strong>Droit de retirer votre consentement</strong> à tout moment.</li>
        </ul>
        <p>
          Pour exercer ces droits : <a href="mailto:dpo@pivot.app">dpo&#64;pivot.app</a>.
          Vous pouvez également introduire une réclamation auprès de la CNIL :
          <a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>.
        </p>

        <h2>9. Cookies</h2>
        <p>
          La plateforme PIVOT utilise un cookie de session HTTP-only
          (<code>pivot_session</code>) strictement nécessaire au fonctionnement du service.
          Ce cookie n'est pas utilisé à des fins publicitaires ou de traçage. Aucun cookie
          tiers n'est déposé sans votre consentement explicite.
        </p>

        <h2>10. Modifications</h2>
        <p>
          La présente politique peut être mise à jour. Toute modification substantielle vous
          sera notifiée par email au moins 30 jours avant son entrée en vigueur.
        </p>
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
    :host-context([data-theme="dark"]) .legal-page { background: var(--auth-gradient); }
  `]
})
export class PrivacyComponent {
  private readonly location = inject(Location);
  private readonly transloco = inject(TranslocoService);
  readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  goBack(): void { this.location.back(); }
}
