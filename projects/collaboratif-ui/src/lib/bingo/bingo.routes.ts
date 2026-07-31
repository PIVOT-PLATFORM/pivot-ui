import { Routes } from '@angular/router';

/**
 * Bingo des réunions (US47.1.1) route tree, mounted by the consuming shell under an authenticated
 * path — mirrors {@code sessionRoutes}' shape (`new`/`join` + a `:roomId` detail route).
 *
 * `join`/`:roomId` are participant-facing and duplicated, unguarded, in
 * {@link bingoPublicRoutes} below — see that export's own TSDoc for why.
 */
export const bingoRoutes: Routes = [
  {
    path: 'new',
    loadComponent: () => import('./bingo-create/bingo-create.component').then(m => m.BingoCreateComponent),
  },
  {
    path: 'join',
    loadComponent: () => import('./bingo-join/bingo-join.component').then(m => m.BingoJoinComponent),
  },
  {
    // Real-time board (AC-47.1.1-06..14) — player grid or spectator progress view.
    path: ':roomId',
    loadComponent: () => import('./bingo-board/bingo-board.component').then(m => m.BingoBoardComponent),
  },
];

/**
 * Participant-facing subset of {@link bingoRoutes} — `join`, `:roomId` — mounted a **second
 * time**, unguarded, at the consuming shell's public route fallback level.
 *
 * AC-47.1.1-03 is explicit: an anonymous participant (no PIVOT account, no bearer token) must be
 * able to join and play. Nesting these routes only inside {@link bingoRoutes} (itself gated by
 * the shell's authenticated route tree) would make them structurally unreachable by exactly the
 * caller this AC exists to serve — same rationale, and the same established pattern, as
 * `collaboratif-ui`'s own `sessionPublicRoutes` (US19.2.1).
 */
export const bingoPublicRoutes: Routes = [
  {
    path: 'join',
    loadComponent: () => import('./bingo-join/bingo-join.component').then(m => m.BingoJoinComponent),
  },
  {
    path: ':roomId',
    loadComponent: () => import('./bingo-board/bingo-board.component').then(m => m.BingoBoardComponent),
  },
];
