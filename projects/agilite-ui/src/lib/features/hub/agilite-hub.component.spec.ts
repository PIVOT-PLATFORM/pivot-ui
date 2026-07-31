import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach } from 'vitest';
import { AgiliteHubComponent } from './agilite-hub.component';

function create(): ComponentFixture<AgiliteHubComponent> {
  TestBed.configureTestingModule({
    imports: [AgiliteHubComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(AgiliteHubComponent);
  fixture.detectChanges();
  return fixture;
}

interface HubApi {
  tab(): string;
  select(t: 'daily' | 'wheel' | 'capacity' | 'poker' | 'pi'): void;
}

describe('AgiliteHubComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('démarre sur l\'onglet Daily et expose un vrai lien de navigation (US10.1.1, évite l\'orphelinage de route)', () => {
    const fixture = create();
    const cmp = fixture.componentInstance as unknown as HubApi;
    expect(cmp.tab()).toBe('daily');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[routerLink="standup"]');
    expect(link).not.toBeNull();
  });

  it('l\'onglet Roue d\'équipe expose un vrai lien de navigation (évite l\'orphelinage de route)', () => {
    const fixture = create();
    const cmp = fixture.componentInstance as unknown as HubApi;
    cmp.select('wheel');
    fixture.detectChanges();
    expect(cmp.tab()).toBe('wheel');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[routerLink="wheels"]');
    expect(link).not.toBeNull();
  });

  it('l\'onglet Capacity expose un vrai lien de navigation (US11.1.1, évite l\'orphelinage de route)', () => {
    const fixture = create();
    const cmp = fixture.componentInstance as unknown as HubApi;
    cmp.select('capacity');
    fixture.detectChanges();
    expect(cmp.tab()).toBe('capacity');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[routerLink="capacity"]');
    expect(link).not.toBeNull();
  });

  it('l\'onglet Planning Poker expose les liens vers créer et rejoindre une room', () => {
    const fixture = create();
    const cmp = fixture.componentInstance as unknown as HubApi;
    cmp.select('poker');
    fixture.detectChanges();
    expect(cmp.tab()).toBe('poker');

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.agh__poker-actions a[href]'),
    ).map(a => a.getAttribute('href'));
    // Deux points d'entrée reachable vers la feature poker (routes autrement orphelines).
    expect(links.some(h => h?.includes('scrum-poker/rooms/new'))).toBe(true);
    expect(links.some(h => h?.includes('scrum-poker/rooms/join'))).toBe(true);
  });

  it('l\'onglet PI Planning expose un vrai lien de navigation (US50.1.1, évite l\'orphelinage de route)', () => {
    const fixture = create();
    const cmp = fixture.componentInstance as unknown as HubApi;
    cmp.select('pi');
    fixture.detectChanges();
    expect(cmp.tab()).toBe('pi');

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[routerLink="pi"]');
    expect(link).not.toBeNull();
  });
});
