import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DELEGATIONS,
  LEAD_ROLE_META,
  LEADERSHIP,
  OrgUnit,
  TEAM_COLORS,
  TEAMS,
  TeamSeed,
  UNITS,
  ancestorChain,
  rollupCount,
  unitById,
  unitDepth,
} from './teams.model';

interface TreeRow {
  readonly id: string;
  readonly name: string;
  readonly levelLabel: string;
  readonly indent: number;
  readonly selected: boolean;
}
interface DetailView {
  readonly name: string;
  readonly levelLabel: string;
  readonly directCount: number;
  readonly rollupCount: number;
  readonly teamCount: number;
  readonly leadership: readonly { name: string; initials: string; roleLabel: string; roleKind: string }[];
  readonly teams: readonly {
    name: string;
    color: string;
    members: readonly {
      name: string;
      initials: string;
      roleLabel: string;
      external: boolean;
      attachedTo: string | null;
    }[];
  }[];
  readonly delegations: readonly { delegator: string; delegate: string; dateLabel: string; motif: string; scopeLabel: string }[];
}

/**
 * Teams / org-chart management screen (`/teams`, "Mes équipes") — replaces the coming-soon
 * placeholder. Left: selectable org-unit tree; right: the selected unit's head-count roll-up,
 * leadership, attached teams (with members / external members), and active delegations. A modal
 * creates a team, attached to a unit or autonomous.
 *
 * **Mode test.** No org-unit/team CRUD backend exists yet — all data comes from the pure
 * {@link teams.model} demo model and every mutation (select, create team) is local state only
 * (see the model's TSDoc). PIVOT charter throughout (tokens, square radii, Fira).
 */
@Component({
  selector: 'app-teams-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './teams-admin.component.html',
  styleUrl: './teams-admin.component.scss',
})
export class TeamsAdminComponent {
  protected readonly units = UNITS;
  protected readonly colors = TEAM_COLORS;

  protected readonly selectedId = signal('pole-secu');
  protected readonly showNewTeam = signal(false);
  protected readonly newTeamName = signal('');
  protected readonly newTeamMode = signal<'attached' | 'orphan'>('attached');
  protected readonly newTeamUnitId = signal('pole-secu');
  protected readonly newTeamColor = signal(TEAM_COLORS[0]);
  private readonly orphanTeams = signal<TeamSeed[]>([]);
  private readonly extraTeamsByUnit = signal<Record<string, TeamSeed[]>>({});

  protected readonly tree = computed<TreeRow[]>(() => {
    const sel = this.selectedId();
    return UNITS.map(u => ({
      id: u.id,
      name: u.name,
      levelLabel: u.level,
      indent: 10 + unitDepth(u.id) * 16,
      selected: u.id === sel,
    }));
  });

  protected readonly breadcrumb = computed<readonly OrgUnit[]>(() => ancestorChain(this.selectedId()));

  protected readonly detail = computed<DetailView>(() => {
    const id = this.selectedId();
    const u = unitById(id)!;
    const seeds = [...(TEAMS[id] ?? []), ...(this.extraTeamsByUnit()[id] ?? [])];
    const teams = seeds.map(t => ({
      name: t.name,
      color: t.color,
      members: t.members.map(m => ({
        name: m.name,
        initials: m.initials,
        roleLabel: m.roleLabel,
        external: m.external === true,
        attachedTo: m.attachedTo ?? null,
      })),
    }));
    const leadership = (LEADERSHIP[id] ?? []).map(l => ({
      name: l.name,
      initials: l.initials,
      roleLabel: LEAD_ROLE_META[l.role].label,
      roleKind: LEAD_ROLE_META[l.role].kind,
    }));
    const delegations = (DELEGATIONS[id] ?? []).map(d => ({
      delegator: d.delegator,
      delegate: d.delegate,
      dateLabel: `Du ${d.from} au ${d.to}`,
      motif: d.motif,
      scopeLabel: d.scope === 'SUBTREE' ? 'Sous-arbre' : 'Unité',
    }));
    return {
      name: u.name,
      levelLabel: u.level,
      directCount: u.directCount,
      rollupCount: rollupCount(id),
      teamCount: teams.length,
      leadership,
      teams,
      delegations,
    };
  });

  protected readonly orphanTeamsView = computed(() => this.orphanTeams());
  protected readonly createDisabled = computed(() => this.newTeamName().trim().length === 0);

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected openNewTeam(): void {
    this.newTeamName.set('');
    this.newTeamMode.set('attached');
    this.newTeamUnitId.set(this.selectedId());
    this.newTeamColor.set(TEAM_COLORS[0]);
    this.showNewTeam.set(true);
  }
  protected closeNewTeam(): void {
    this.showNewTeam.set(false);
  }

  protected onNameInput(event: Event): void {
    this.newTeamName.set((event.target as HTMLInputElement).value);
  }
  protected onUnitChange(event: Event): void {
    this.newTeamUnitId.set((event.target as HTMLSelectElement).value);
  }

  protected createTeam(): void {
    const name = this.newTeamName().trim();
    if (!name) {
      return;
    }
    const team: TeamSeed = { name, color: this.newTeamColor(), members: [] };
    if (this.newTeamMode() === 'attached') {
      const unitId = this.newTeamUnitId();
      const current = this.extraTeamsByUnit();
      this.extraTeamsByUnit.set({ ...current, [unitId]: [...(current[unitId] ?? []), team] });
      this.selectedId.set(unitId);
    } else {
      this.orphanTeams.set([...this.orphanTeams(), team]);
    }
    this.showNewTeam.set(false);
  }
}
