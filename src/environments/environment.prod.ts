// Utilisé en build `production` via fileReplacements (angular.json). apiUrl relatif `/api` :
// l'image Docker nginx proxifie /api → backend (voir nginx.conf). NE PAS mettre d'URL absolue
// ici (casserait le déploiement derrière reverse-proxy). Les builds CI (e2e/lighthouse/dast)
// utilisent la config `ci` → environment.ts (http://localhost:8080/api, serve sans proxy).
// bugReportUrl : configurable par déploiement (mailto: ou URL tracker).
export const environment = {
  production: true,
  apiUrl: '/api',
  // EN53 (ADR-030) — routed by this image's nginx.conf (/api/collaboratif/ → pivot-core modulith,
  // see the gateway table at the top of nginx.conf). Relative for the same reverse-proxy reason
  // as apiUrl above.
  collaboratifApiUrl: '/api/collaboratif',
  // EN53 (ADR-030) — routed by this image's nginx.conf (/api/agilite/ → pivot-core modulith).
  // Relative for the reverse-proxy reason above.
  agiliteApiUrl: '/api/agilite',
  // agilite native STOMP WS — EN53 (ADR-030) : endpoint sous le context-path global /api du
  // modulith (/api/agilite/ws/agilite) ; nginx.conf route /api/agilite/ws/ → pivot-core:8080.
  agiliteWsUrl: '/api/agilite/ws/agilite',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
