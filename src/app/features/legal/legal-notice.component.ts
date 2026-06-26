import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'piv-legal-notice',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <a routerLink="/auth/login" class="back-link">← Retour à la connexion</a>

        <h1>Mentions légales</h1>
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
          la précision ou l'exhaustivité des informations mises à disposition. La société
          décline toute responsabilité pour les éventuelles inexactitudes, imprécisions
          ou omissions.
        </p>

        <h2>5. Droit applicable et juridiction</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige
          et à défaut de règlement amiable, les tribunaux de Paris seront compétents.
        </p>

        <h2>6. Contact</h2>
        <p>Pour toute question relative aux présentes mentions légales :</p>
        <ul>
          <li>Email : <a href="mailto:legal@pivot.app">legal&#64;pivot.app</a></li>
          <li>Adresse : PIVOT SAS, Paris, France</li>
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
export class LegalNoticeComponent {}
