/**
 * Pure data + derivations for {@link TeamsAdminComponent} — the teams / org-chart management
 * screen (`/teams`, "Mes équipes"). No Angular, unit-testable.
 *
 * **Test-mode data, deliberately.** `public.teams`/`public.team_members` are read-only from the
 * modules and PIVOT exposes no org-unit/team CRUD backend yet — this screen is the interactive
 * mock ("mode test") of the target admin feature: selecting an org unit, rolling up head-counts,
 * and creating a team (attached to a unit or autonomous) mutate local state only. Swapping this
 * demo model for real endpoints later touches nothing in the component/template.
 */

export type OrgLevel =
  | 'Groupe'
  | 'Entreprise'
  | 'Direction'
  | 'Division'
  | 'Département'
  | 'Pôle';

export interface OrgUnit {
  readonly id: string;
  readonly name: string;
  readonly level: OrgLevel;
  readonly parent: string | null;
  readonly directCount: number;
}

export type LeadershipRole = 'RESPONSABLE' | 'ADJOINT';
export interface Leader {
  readonly name: string;
  readonly initials: string;
  readonly role: LeadershipRole;
}

export interface TeamMemberSeed {
  readonly name: string;
  readonly initials: string;
  readonly roleLabel: string;
  readonly external?: boolean;
  readonly attachedTo?: string;
}
export interface TeamSeed {
  readonly name: string;
  readonly color: string;
  readonly members: readonly TeamMemberSeed[];
}

export interface Delegation {
  readonly delegator: string;
  readonly delegate: string;
  readonly scope: 'SUBTREE' | 'UNIT';
  readonly from: string;
  readonly to: string;
  readonly motif: string;
}

export const UNITS: readonly OrgUnit[] = [
  { id: 'groupe', name: 'Groupe PIVOT', level: 'Groupe', parent: null, directCount: 1 },
  { id: 'entreprise', name: 'PIVOT Platform', level: 'Entreprise', parent: 'groupe', directCount: 1 },
  { id: 'direction', name: 'Direction Produit & Technologie', level: 'Direction', parent: 'entreprise', directCount: 0 },
  { id: 'division', name: 'Division Plateforme', level: 'Division', parent: 'direction', directCount: 0 },
  { id: 'dept-ing', name: 'Département Ingénierie', level: 'Département', parent: 'division', directCount: 1 },
  { id: 'dept-prod', name: 'Département Produit', level: 'Département', parent: 'division', directCount: 1 },
  { id: 'pole-backend', name: 'Pôle Backend', level: 'Pôle', parent: 'dept-ing', directCount: 6 },
  { id: 'pole-frontend', name: 'Pôle Frontend', level: 'Pôle', parent: 'dept-ing', directCount: 5 },
  { id: 'pole-secu', name: 'Pôle Sécurité & SSO', level: 'Pôle', parent: 'dept-ing', directCount: 3 },
  { id: 'pole-pm', name: 'Pôle Product Management', level: 'Pôle', parent: 'dept-prod', directCount: 4 },
  { id: 'pole-design', name: 'Pôle Design', level: 'Pôle', parent: 'dept-prod', directCount: 3 },
];

export const LEADERSHIP: Record<string, readonly Leader[]> = {
  groupe: [{ name: 'Élise Bonnefoy', initials: 'EB', role: 'RESPONSABLE' }],
  entreprise: [
    { name: 'Élise Bonnefoy', initials: 'EB', role: 'RESPONSABLE' },
    { name: 'Vincent Lemoine', initials: 'VL', role: 'ADJOINT' },
  ],
  direction: [
    { name: 'Vincent Lemoine', initials: 'VL', role: 'RESPONSABLE' },
    { name: 'Camille Rousseau', initials: 'CR', role: 'ADJOINT' },
  ],
  division: [{ name: 'Camille Rousseau', initials: 'CR', role: 'RESPONSABLE' }],
  'dept-ing': [
    { name: 'Karim Haddad', initials: 'KH', role: 'RESPONSABLE' },
    { name: 'Thomas Girard', initials: 'TG', role: 'ADJOINT' },
  ],
  'dept-prod': [{ name: 'Marion Caron', initials: 'MC', role: 'RESPONSABLE' }],
  'pole-backend': [{ name: 'Samuel Bertrand', initials: 'SB', role: 'RESPONSABLE' }],
  'pole-frontend': [{ name: 'Léa Fontaine', initials: 'LF', role: 'RESPONSABLE' }],
  'pole-secu': [
    { name: 'Julie Lefèvre', initials: 'JL', role: 'RESPONSABLE' },
    { name: 'Nadia Benali', initials: 'NB', role: 'ADJOINT' },
  ],
  'pole-pm': [{ name: 'Marion Caron', initials: 'MC', role: 'RESPONSABLE' }],
  'pole-design': [{ name: 'Antoine Roux', initials: 'AR', role: 'RESPONSABLE' }],
};

export const TEAMS: Record<string, readonly TeamSeed[]> = {
  'pole-backend': [
    {
      name: 'Backend Core',
      color: 'var(--color-brand-500)',
      members: [
        { name: 'Samuel Bertrand', initials: 'SB', roleLabel: 'Responsable' },
        { name: 'Karim Haddad', initials: 'KH', roleLabel: 'Membre' },
      ],
    },
  ],
  'pole-frontend': [
    {
      name: 'Frontend Whiteboard',
      color: 'var(--color-info)',
      members: [
        { name: 'Léa Fontaine', initials: 'LF', roleLabel: 'Responsable' },
        { name: 'Thomas Girard', initials: 'TG', roleLabel: 'Membre' },
      ],
    },
  ],
  'pole-secu': [
    {
      name: 'Sécurité & Identité',
      color: 'var(--color-error)',
      members: [
        { name: 'Julie Lefèvre', initials: 'JL', roleLabel: 'Responsable' },
        { name: 'Samuel Bertrand', initials: 'SB', roleLabel: 'Membre' },
        { name: 'Nadia Benali', initials: 'NB', roleLabel: 'Membre' },
      ],
    },
  ],
  'pole-pm': [
    {
      name: 'Product Management',
      color: 'var(--color-success)',
      members: [
        { name: 'Marion Caron', initials: 'MC', roleLabel: 'Responsable' },
        { name: 'Hugo Meyer', initials: 'HM', roleLabel: 'Membre', external: true, attachedTo: 'Marion Caron' },
      ],
    },
  ],
  'pole-design': [
    {
      name: 'Design',
      color: 'var(--color-warning)',
      members: [{ name: 'Antoine Roux', initials: 'AR', roleLabel: 'Responsable' }],
    },
  ],
};

export const DELEGATIONS: Record<string, readonly Delegation[]> = {
  'pole-secu': [
    { delegator: 'Julie Lefèvre', delegate: 'Nadia Benali', scope: 'SUBTREE', from: '20 juillet', to: '3 août 2026', motif: 'congés' },
  ],
};

export const TEAM_COLORS: readonly string[] = [
  'var(--color-brand-500)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
];

export const LEAD_ROLE_META: Record<LeadershipRole, { label: string; kind: 'responsable' | 'adjoint' }> = {
  RESPONSABLE: { label: 'Responsable', kind: 'responsable' },
  ADJOINT: { label: 'Adjoint', kind: 'adjoint' },
};

const BY_ID: Record<string, OrgUnit> = Object.fromEntries(UNITS.map(u => [u.id, u]));

/** Cumulated head-count of a unit and every descendant (roll-up). */
export function rollupCount(id: string, extraByUnit: Record<string, readonly TeamSeed[]> = {}): number {
  const u = BY_ID[id];
  if (!u) {
    return 0;
  }
  const children = UNITS.filter(c => c.parent === id);
  return u.directCount + children.reduce((s, c) => s + rollupCount(c.id, extraByUnit), 0);
}

/** 0-based depth of a unit in the org tree. */
export function unitDepth(id: string): number {
  let depth = 0;
  let p = BY_ID[id]?.parent ?? null;
  while (p) {
    depth++;
    p = BY_ID[p]?.parent ?? null;
  }
  return depth;
}

/** Root→unit ancestor chain (inclusive), for the breadcrumb. */
export function ancestorChain(id: string): readonly OrgUnit[] {
  const chain: OrgUnit[] = [];
  let cur: OrgUnit | undefined = BY_ID[id];
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent ? BY_ID[cur.parent] : undefined;
  }
  return chain;
}

export function unitById(id: string): OrgUnit | undefined {
  return BY_ID[id];
}
