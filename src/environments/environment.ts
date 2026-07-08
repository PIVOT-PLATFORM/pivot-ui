export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // EN17.9 — module whiteboard (@pivot-platform/collaboratif-ui) : URL absolue vers
  // pivot-collaboratif-core, distincte de `apiUrl` (pivot-core) — aucun proxy ne route
  // /api/collaboratif vers le bon backend en dev (ng serve). Voir environment.prod.ts.
  collaboratifApiUrl: 'http://localhost:8083/api/collaboratif',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
