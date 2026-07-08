export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // EN17.10 — backend of the whiteboard module lazy-loaded from @pivot-platform/collaboratif-ui,
  // same absolute-URL-in-dev convention as apiUrl above (mirrors collaboratif-ui's own
  // environment.ts, which this shell's fileReplacements no longer apply to once packaged).
  collaboratifApiUrl: 'http://localhost:8083/api/collaboratif',
  googleClientId: '',
  bugReportUrl: 'mailto:bugs@pivot-platform.fr?subject=Bug%20PIVOT',
};
