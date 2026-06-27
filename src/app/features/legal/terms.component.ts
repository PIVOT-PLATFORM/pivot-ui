import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'piv-terms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <a routerLink="/auth/login" class="back-link">← Retour à la connexion</a>

        <h1>Conditions Générales d'Utilisation</h1>
        <p class="updated">Version 0.1 — Juin 2026 (pré-production)</p>

        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) définissent les règles
          d'utilisation de la plateforme <strong>PIVOT Suite Collaborative</strong>,
          éditée par PIVOT SAS. Toute utilisation de la plateforme implique l'acceptation
          pleine et entière des présentes CGU.
        </p>

        <h2>Article 2 — Accès au service</h2>
        <p>
          L'accès à PIVOT est réservé aux utilisateurs disposant d'un compte valide
          créé par leur organisation (tenant). La création de compte est soumise à la
          vérification de l'adresse email.
        </p>
        <p>
          L'accès peut être fourni via :
        </p>
        <ul>
          <li>Authentification par email/mot de passe ;</li>
          <li>Authentification Google OAuth2 ;</li>
          <li>Authentification SSO d'entreprise (OIDC/SAML — offre Enterprise).</li>
        </ul>

        <h2>Article 3 — Obligations de l'utilisateur</h2>
        <p>L'utilisateur s'engage à :</p>
        <ul>
          <li>Fournir des informations exactes lors de l'inscription ;</li>
          <li>Maintenir la confidentialité de ses identifiants de connexion ;</li>
          <li>Ne pas partager son compte avec des tiers ;</li>
          <li>Utiliser la plateforme dans le respect des lois applicables et des droits des tiers ;</li>
          <li>Ne pas tenter d'accéder à des données appartenant à d'autres utilisateurs ou tenants ;</li>
          <li>Ne pas perturber le fonctionnement de la plateforme (attaques, scraping, etc.).</li>
        </ul>

        <h2>Article 4 — Propriété des données</h2>
        <p>
          Les données saisies par l'utilisateur sur la plateforme restent sa propriété
          exclusive. PIVOT SAS ne revendique aucun droit de propriété sur les contenus
          créés par les utilisateurs.
        </p>
        <p>
          L'utilisateur accorde à PIVOT SAS une licence non exclusive, mondiale et
          gratuite pour héberger, stocker et afficher ses données dans le seul but
          de fournir le service.
        </p>

        <h2>Article 5 — Sécurité et sessions</h2>
        <p>
          PIVOT met en place des mécanismes de sécurité avancés :
        </p>
        <ul>
          <li>Sessions opaques à durée de vie limitée (24h par défaut, 30 jours avec «Se souvenir de moi») ;</li>
          <li>Vérification d'appareil par OTP email pour les nouvelles connexions ;</li>
          <li>Limitation du nombre de sessions simultanées par utilisateur ;</li>
          <li>Journalisation des événements de sécurité.</li>
        </ul>
        <p>
          L'utilisateur est responsable de toute activité réalisée depuis son compte.
          En cas de suspicion de compromission, il doit en informer immédiatement
          <a href="mailto:security@pivot.app">security&#64;pivot.app</a>.
        </p>

        <h2>Article 6 — Disponibilité du service</h2>
        <p>
          PIVOT SAS s'efforce d'assurer la disponibilité de la plateforme 24h/24 et
          7j/7. Des interruptions pour maintenance peuvent toutefois être nécessaires.
          PIVOT SAS ne saurait être tenue responsable des interruptions de service
          indépendantes de sa volonté.
        </p>

        <h2>Article 7 — Résiliation</h2>
        <p>
          PIVOT SAS se réserve le droit de suspendre ou résilier l'accès d'un
          utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité.
        </p>
        <p>
          L'utilisateur peut demander la suppression de son compte à tout moment en
          contactant <a href="mailto:support@pivot.app">support&#64;pivot.app</a>.
          Les données sont supprimées dans un délai de 30 jours.
        </p>

        <h2>Article 8 — Limitation de responsabilité</h2>
        <p>
          PIVOT SAS ne saurait être tenue responsable de dommages indirects, de pertes
          de données ou de manque à gagner résultant de l'utilisation ou de
          l'impossibilité d'utiliser la plateforme.
        </p>

        <h2>Article 9 — Modifications des CGU</h2>
        <p>
          PIVOT SAS se réserve le droit de modifier les présentes CGU à tout moment.
          Les utilisateurs seront informés de toute modification substantielle par email
          au moins 30 jours avant son entrée en vigueur. La poursuite de l'utilisation
          de la plateforme après cette date vaut acceptation des nouvelles CGU.
        </p>

        <h2>Article 10 — Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          les parties s'engagent à rechercher une solution amiable avant tout recours
          judiciaire. À défaut, les tribunaux compétents de Paris seront saisis.
        </p>

        <h2>Contact</h2>
        <ul>
          <li>Support : <a href="mailto:support@pivot.app">support&#64;pivot.app</a></li>
          <li>Sécurité : <a href="mailto:security@pivot.app">security&#64;pivot.app</a></li>
          <li>Juridique : <a href="mailto:legal@pivot.app">legal&#64;pivot.app</a></li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: var(--auth-gradient);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 24px;
    }
    .legal-card {
      background: #fff;
      border-radius: 16px;
      padding: 48px;
      max-width: 760px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      @media (max-width: 600px) { padding: 28px 20px; }
    }
    .back-link {
      display: inline-block;
      margin-bottom: 28px;
      color: #5b21b6;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    h1 { font-size: 1.75rem; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; }
    .updated { font-size: 0.8rem; color: #6b7280; margin-bottom: 32px; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #312e81; margin: 28px 0 10px; }
    p, li { font-size: 0.9375rem; color: #374151; line-height: 1.7; }
    ul { padding-left: 20px; }
    a { color: #5b21b6; }
  `]
})
export class TermsComponent {}
