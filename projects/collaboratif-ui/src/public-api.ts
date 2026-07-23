// Config
// COLLABORATIF_CURRENT_USER bridges the host shell's authenticated profile to the whiteboard
// presence layer (board:join displayName) — the consumer (pivot-ui) provides it; without it the
// backend labels every participant "Anonymous". See pivot-ui app.config.ts.
export { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN, COLLABORATIF_CURRENT_USER } from './lib/core/whiteboard/config/tokens';
export type { CollaboratifCurrentUser } from './lib/core/whiteboard/config/tokens';
export { provideCollaboratifUi } from './lib/core/whiteboard/config/provide-collaboratif-ui';
export type { CollaboratifUiConfig } from './lib/core/whiteboard/config/provide-collaboratif-ui';

// Routes — mounted by the consuming shell under a guarded path (e.g. moduleGuard('whiteboard')
// from @pivot-platform/ui-core), see pivot-docs EN17.9.
export { whiteboardRoutes as COLLABORATIF_ROUTES } from './lib/whiteboard/whiteboard.routes';

// Module Session live (E19) — mounted by the shell under moduleGuard('session'), see
// pivot-docs EPIC-module-session US19.2.2 (`SESSION_ROUTE`/`loadSessionModule` in pivot-ui's
// app.routes.ts). Shares `provideCollaboratifUi`/`COLLABORATIF_API_URL` above — no separate
// config entry point, this is the same `collaboratif` backend module (`fr.pivot.collaboratif`),
// just a different route subtree.
export { sessionRoutes as SESSION_ROUTES } from './lib/session/session.routes';

// Participant-facing subset of SESSION_ROUTES (join, :sessionId/play, :sessionId/results),
// unguarded — mounted a second time at the shell's public route fallback level so an anonymous
// ROLE_GUEST participant (US19.2.1, no PIVOT account, no bearer token) can actually reach it. See
// `sessionPublicRoutes`'s own TSDoc in session.routes.ts for the full rationale.
export { sessionPublicRoutes as SESSION_PUBLIC_ROUTES } from './lib/session/session.routes';
