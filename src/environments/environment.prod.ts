// Utilisé en build `production` via fileReplacements (angular.json). apiUrl relatif `/api` :
// l'image Docker nginx proxifie /api → backend (voir nginx.conf). NE PAS mettre d'URL absolue
// ici (casserait le déploiement derrière reverse-proxy). Les builds CI (e2e/lighthouse/dast)
// utilisent la config `ci` → environment.ts (http://localhost:8080/api, serve sans proxy).
// bugReportUrl : configurable par déploiement (mailto: ou URL tracker).
export const environment = {
  production: true,
  apiUrl: '/api',
  // EN17.10 — routed by this image's nginx.conf (/api/collaboratif/ → pivot-collaboratif-core,
  // see the multi-backend gateway table at the top of nginx.conf, EN17.7). Relative for the same
  // reverse-proxy reason as apiUrl above.
  collaboratifApiUrl: '/api/collaboratif',
  // EN18 — routed by this image's nginx.conf (/api/agilite/ → pivot-agilite-core,
  // EN17.7 gateway table). Relative for the reverse-proxy reason above.
  agiliteApiUrl: '/api/agilite',
  // agilite native STOMP WS — this image's nginx.conf routes /ws/agilite → pivot-agilite-core.
  agiliteWsUrl: '/ws/agilite',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
