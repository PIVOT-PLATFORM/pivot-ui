export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // EN53.4 (Vague 4 modulith) — agilite et collaboratif ne sont plus des backends séparés sur
  // :8082/:8083 : le modulith unique sert tout depuis la même origine que le shell (:8080).
  // Chemins relatifs même-origine (comme apiUrl ci-dessus) ; nginx.dev.conf route déjà ces
  // préfixes vers le modulith. Voir aussi environment.prod.ts (même convention, déjà relative).
  collaboratifApiUrl: '/api/collaboratif',
  agiliteApiUrl: '/api/agilite',
  // agilite uses a native STOMP WebSocket (US09.1.2). EN53 (ADR-030) — le module agilité
  // enregistre son endpoint sous le context-path global /api : /api/agilite/ws/agilite
  // (cf. agilite/config/WebSocketConfig). nginx route ce préfixe vers le modulith :8080.
  // Chemin relatif : *WsService.buildWsUrl() (agilite-ui) résout déjà un chemin relatif en
  // ws(s)://<host>/... à partir de window.location — pas besoin d'URL absolue ici.
  agiliteWsUrl: '/api/agilite/ws/agilite',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
