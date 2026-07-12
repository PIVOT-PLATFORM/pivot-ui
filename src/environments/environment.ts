export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // EN17.10 — backend of the whiteboard module lazy-loaded from @pivot-platform/collaboratif-ui,
  // same absolute-URL-in-dev convention as apiUrl above (mirrors collaboratif-ui's own
  // environment.ts, which this shell's fileReplacements no longer apply to once packaged).
  collaboratifApiUrl: 'http://localhost:8083/api/collaboratif',
  // EN18 — pilotage/agilite modules lazy-loaded from @pivot-platform/{pilotage,agilite}-ui,
  // same absolute-URL-in-dev convention. nginx.dev.conf already routes these prefixes.
  pilotageApiUrl: 'http://localhost:8081/api/pilotage',
  agiliteApiUrl: 'http://localhost:8082/api/agilite',
  // agilite uses a native STOMP WebSocket (US09.1.2) — nginx.dev.conf routes /ws/agilite.
  agiliteWsUrl: 'ws://localhost:8082/ws/agilite',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
