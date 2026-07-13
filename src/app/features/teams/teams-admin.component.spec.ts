import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TeamsAdminComponent } from './teams-admin.component';

const FR: Record<string, unknown> = {
  teams: {
    title: 'Gestion des équipes',
    newTeam: 'Nouvelle équipe',
    treeLabel: 'Organigramme',
    stats: { direct: 'Effectif direct', total: 'Effectif total', teams: 'Équipes' },
    leadership: { title: 'État-major', sub: 'Responsable et adjoints.' },
    teams: { title: 'Équipes rattachées', manage: 'Gérer', external: 'Externe', attachedTo: 'Rattaché à {{name}}', empty: 'Aucune équipe.' },
    delegations: { title: 'Délégations actives', empty: 'Aucune délégation.' },
    orphan: { title: 'Équipes autonomes', sub: 'Sans rattachement.', note: '— aucune unité' },
    modal: {
      title: 'Créer une équipe',
      desc: 'Description.',
      nameLabel: "Nom de l'équipe",
      namePlaceholder: 'Ex',
      attachmentLabel: 'Rattachement',
      attachedMode: 'Rattachée à une unité',
      orphanMode: 'Équipe autonome',
      unitLabel: 'Unité',
      unitHint: 'Hint.',
      orphanHint: 'Hint.',
      colorLabel: 'Couleur',
      colorAria: 'Couleur {{color}}',
      cancel: 'Annuler',
      create: "Créer l'équipe",
    },
  },
};

/** A writable signal: callable getter + `.set`. */
interface WSignal<T> {
  (): T;
  set(v: T): void;
}

/** Protected surface exercised by these tests. */
interface TeamsApi {
  selectedId(): string;
  showNewTeam(): boolean;
  createDisabled(): boolean;
  detail(): {
    name: string;
    rollupCount: number;
    teamCount: number;
    leadership: readonly { roleLabel: string }[];
    delegations: readonly { scopeLabel: string; dateLabel: string }[];
  };
  breadcrumb(): readonly { id: string }[];
  orphanTeamsView(): readonly { name: string }[];
  select(id: string): void;
  openNewTeam(): void;
  newTeamName: WSignal<string>;
  newTeamMode: WSignal<'attached' | 'orphan'>;
  newTeamUnitId: WSignal<string>;
  createTeam(): void;
}

describe('TeamsAdminComponent', () => {
  let fixture: ComponentFixture<TeamsAdminComponent>;
  let cmp: TeamsApi;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TeamsAdminComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsAdminComponent);
    cmp = fixture.componentInstance as unknown as TeamsApi;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the full org tree and defaults selection to pole-secu', () => {
    expect(cmp.selectedId()).toBe('pole-secu');
    expect(el.querySelectorAll('.tm__org-row').length).toBe(11);
  });

  it('derives the detail view (roll-up, leadership, delegations) of the selected unit', () => {
    const d = cmp.detail();
    expect(d.name).toBe('Pôle Sécurité & SSO');
    expect(d.rollupCount).toBe(3);
    // pole-secu carries one SUBTREE delegation in the demo model.
    expect(d.delegations.length).toBe(1);
    expect(d.delegations[0].scopeLabel).toBe('Sous-arbre');
    expect(d.delegations[0].dateLabel).toContain('Du ');
    expect(d.leadership.map(l => l.roleLabel)).toEqual(['Responsable', 'Adjoint']);
  });

  it('rebuilds the breadcrumb when another unit is selected', () => {
    cmp.select('pole-design');
    fixture.detectChanges();
    expect(cmp.breadcrumb().map(u => u.id)).toEqual(['groupe', 'entreprise', 'direction', 'division', 'dept-prod', 'pole-design']);
  });

  it('openNewTeam() resets the modal to the current unit, attached mode, empty name', () => {
    cmp.select('pole-frontend');
    cmp.openNewTeam();
    expect(cmp.showNewTeam()).toBe(true);
    expect(cmp.newTeamMode()).toBe('attached');
    expect(cmp.newTeamUnitId()).toBe('pole-frontend');
    expect(cmp.newTeamName()).toBe('');
    expect(cmp.createDisabled()).toBe(true);
  });

  it('disables create until a non-blank name is entered', () => {
    cmp.openNewTeam();
    cmp.newTeamName.set('   ');
    expect(cmp.createDisabled()).toBe(true);
    cmp.newTeamName.set('Support SSO');
    expect(cmp.createDisabled()).toBe(false);
  });

  it('createTeam() (attached) adds the team to its unit and selects it', () => {
    cmp.openNewTeam();
    cmp.newTeamUnitId.set('pole-design');
    cmp.newTeamName.set('Design Ops');
    const before = cmp.detail().teamCount; // whatever pole-secu had — irrelevant after re-select

    cmp.createTeam();
    fixture.detectChanges();

    expect(cmp.showNewTeam()).toBe(false);
    expect(cmp.selectedId()).toBe('pole-design');
    // pole-design seeds one team ('Design') + the new one.
    expect(cmp.detail().teamCount).toBe(2);
    expect(before).toBeGreaterThanOrEqual(0);
  });

  it('createTeam() (orphan) adds a standalone team without touching unit roll-ups', () => {
    cmp.openNewTeam();
    cmp.newTeamMode.set('orphan');
    cmp.newTeamName.set('Task Force X');

    cmp.createTeam();
    fixture.detectChanges();

    expect(cmp.orphanTeamsView().map(t => t.name)).toContain('Task Force X');
    expect(el.querySelector('.tm__orphan')).not.toBeNull();
  });

  it('ignores createTeam() with a blank name', () => {
    cmp.openNewTeam();
    cmp.newTeamMode.set('orphan');
    cmp.newTeamName.set('   ');
    cmp.createTeam();
    expect(cmp.orphanTeamsView().length).toBe(0);
    expect(cmp.showNewTeam()).toBe(true);
  });

  it('closes the modal on Escape (keyboard dismiss) and is a no-op when closed', () => {
    (cmp as unknown as { onEscape(): void }).onEscape();
    expect(cmp.showNewTeam()).toBe(false); // no-op while closed

    cmp.openNewTeam();
    expect(cmp.showNewTeam()).toBe(true);
    (cmp as unknown as { onEscape(): void }).onEscape();
    expect(cmp.showNewTeam()).toBe(false);
  });

  it('localises the static chrome through Transloco', () => {
    expect(el.querySelector('.tm__title')?.textContent).toContain('Gestion des équipes');
    expect(el.querySelector('.tm__tree')?.getAttribute('aria-label')).toBe('Organigramme');
  });
});
