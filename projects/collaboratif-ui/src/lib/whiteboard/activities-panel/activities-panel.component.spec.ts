import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivitiesPanelComponent } from './activities-panel.component';

const FR: Record<string, unknown> = {
  whiteboard: {
    activities: {
      title: 'Activités',
      close: 'Fermer',
      recentSection: 'Récemment utilisées',
      soon: 'Bientôt disponible',
      items: {
        brainstorming: { name: 'Brainstorming', desc: 'Générez des idées' },
        poll: { name: 'Sondage', desc: 'Votez en direct' },
        dotvote: { name: 'Vote à points', desc: 'Priorisez' },
        icebreaker: { name: 'Icebreaker', desc: 'Question légère' },
        quiz: { name: 'Quiz', desc: 'Testez' },
        timer: { name: 'Minuteur', desc: 'Temps limité' },
        retro: { name: 'Rétrospective', desc: '3 colonnes' },
      },
    },
  },
};

describe('ActivitiesPanelComponent', () => {
  let fixture: ComponentFixture<ActivitiesPanelComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ActivitiesPanelComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivitiesPanelComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('lists the full activity catalogue with localised names', () => {
    const items = el.querySelectorAll('.wb-act__item');
    expect(items.length).toBe(7);
    expect(items[0].querySelector('.wb-act__item-name')?.textContent).toContain('Brainstorming');
    expect(items[0].querySelector('.wb-act__item-desc')?.textContent).toContain('Générez des idées');
  });

  it('renders the two recently-used shortcuts (first + last activity)', () => {
    const recent = el.querySelectorAll('.wb-act__recent-card');
    expect(recent.length).toBe(2);
    expect(recent[0].querySelector('.wb-act__recent-name')?.textContent).toContain('Brainstorming');
    expect(recent[1].querySelector('.wb-act__recent-name')?.textContent).toContain('Rétrospective');
  });

  it('localises the panel title and close control', () => {
    expect(el.querySelector('.wb-act__title')?.textContent).toContain('Activités');
    expect(el.querySelector('.wb-act__close')?.getAttribute('aria-label')).toBe('Fermer');
    expect(el.querySelector('.wb-act__section')?.textContent).toContain('Récemment utilisées');
  });

  it('emits launch with the activity id when an available list item is clicked', () => {
    const emitted: string[] = [];
    fixture.componentInstance.launch.subscribe((id: string) => emitted.push(id));

    // index 2 = dot-vote (index 1 is the poll, which is disabled — see below).
    (el.querySelectorAll('.wb-act__item')[2] as HTMLButtonElement).click();

    expect(emitted).toEqual(['dotvote']);
  });

  it('disables the activities that have no implementation and never emits launch for them', () => {
    const emitted: string[] = [];
    fixture.componentInstance.launch.subscribe((id: string) => emitted.push(id));
    const poll = el.querySelectorAll('.wb-act__item')[1] as HTMLButtonElement;

    expect(poll.disabled).toBe(true);
    poll.click();

    expect(emitted).toEqual([]);
  });

  it('labels an unavailable activity with a textual "coming soon" hint bound by aria-describedby', () => {
    const poll = el.querySelectorAll('.wb-act__item')[1] as HTMLButtonElement;
    const hint = poll.querySelector('.wb-act__soon');

    expect(hint?.textContent).toContain('Bientôt disponible');
    // The state must not rest on colour/opacity alone (WCAG 1.4.1).
    expect(poll.getAttribute('aria-describedby')).toBe(hint?.id);
    expect(hint?.id).toBeTruthy();
  });

  it('leaves every implemented activity enabled', () => {
    const items = [...el.querySelectorAll<HTMLButtonElement>('.wb-act__item')];
    const enabled = items.filter((b) => !b.disabled).length;

    expect(enabled).toBe(6);
  });

  it('emits launch from a recently-used shortcut', () => {
    const emitted: string[] = [];
    fixture.componentInstance.launch.subscribe((id: string) => emitted.push(id));

    (el.querySelectorAll('.wb-act__recent-card')[1] as HTMLButtonElement).click();

    expect(emitted).toEqual(['retro']);
  });

  it('emits close when the close button is clicked', () => {
    let closed = 0;
    fixture.componentInstance.close.subscribe(() => closed++);

    (el.querySelector('.wb-act__close') as HTMLButtonElement).click();

    expect(closed).toBe(1);
  });
});
