// Utilisé en build `production` via fileReplacements (angular.json). apiUrl relatif `/api` :
// l'image Docker nginx proxifie /api → backend (voir nginx.conf). NE PAS mettre d'URL absolue
// ici (casserait le déploiement derrière reverse-proxy). Les builds CI (e2e/lighthouse/dast)
// utilisent la config `ci` → environment.ts (http://localhost:8080/api, serve sans proxy).
// bugReportUrl : configurable par déploiement (mailto: ou URL tracker).
export const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
