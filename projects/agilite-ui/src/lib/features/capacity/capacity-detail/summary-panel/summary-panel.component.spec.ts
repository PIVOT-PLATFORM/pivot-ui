import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CapacitySummaryResponse } from '../../models/capacity.model';
import { SummaryPanelComponent } from './summary-panel.component';

const baseSummary: CapacitySummaryResponse = {
  eventId: 'sprint-1',
  eventType: 'SPRINT',
  eventName: 'Sprint 1',
  totalWorkingDays: 10,
  members: [
    {
      memberId: 'member-1',
      name: 'Ada Lovelace',
      role: 'Dev',
      quotite: 1,
      excluded: false,
      effectiveFocus: 0.8,
      absentWorkingDays: 1,
      workedDays: 9,
      netCapacity: 7.2,
      points: 8,
      recommendedEngagement: 7,
    },
  ],
  totalNetPersonDays: 9,
  totalNetCapacity: 7.2,
  totalPoints: 20,
  totalRecommendedEngagement: 18,
  loadRatio: 0.9,
  predictability: 0.85,
  consolidation: null,
  gauge: {
    engagedPoints: 18,
    referenceEngagement: 20,
    overflowThreshold: 24,
    engagementRatio: 0.9,
    overCommitted: false,
  },
};

describe('SummaryPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryPanelComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    }).compileComponents();
  });

  function createFixture(summary: CapacitySummaryResponse | null = baseSummary, loadError = false) {
    const fixture = TestBed.createComponent(SummaryPanelComponent);
    fixture.componentRef.setInput('summary', summary);
    fixture.componentRef.setInput('loadError', loadError);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the load-error banner and nothing else when loading failed', () => {
    const fixture = createFixture(null, true);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('capacity.summary.loadError');
    expect(el.querySelector('table')).toBeFalsy();
  });

  it('renders event totals and the per-member breakdown table', () => {
    const fixture = createFixture();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ada Lovelace');
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Dev');
  });

  it('does not render the consolidation section when consolidation is null', () => {
    const fixture = createFixture();
    expect(fixture.nativeElement.querySelector('.summary-panel__consolidation')).toBeFalsy();
  });

  it('renders the PI consolidation block when present', () => {
    const fixture = createFixture({
      ...baseSummary,
      consolidation: {
        totalJoursHommeNets: 40,
        totalCapaciteNette: 32,
        totalPoints: 90,
        includedSprintCount: 4,
        excludedIpSprintCount: 1,
      },
    });
    const el: HTMLElement = fixture.nativeElement;
    const section = el.querySelector('.summary-panel__consolidation');
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain('40');
  });

  it('renders the engagement gauge in a normal state', () => {
    const fixture = createFixture();
    const el: HTMLElement = fixture.nativeElement;
    const gauge = el.querySelector('.summary-panel__gauge');
    expect(gauge?.classList.contains('summary-panel__gauge--over')).toBe(false);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('capacity.gauge.ok');
    expect(el.querySelector('[role="alert"]')).toBeFalsy();
  });

  it('shows the overCommitted alert and applies the over-committed visual state when the gauge overflows', () => {
    const fixture = createFixture({
      ...baseSummary,
      gauge: {
        engagedPoints: 26,
        referenceEngagement: 20,
        overflowThreshold: 24,
        engagementRatio: 1.3,
        overCommitted: true,
      },
    });
    const el: HTMLElement = fixture.nativeElement;
    const gauge = el.querySelector('.summary-panel__gauge');
    expect(gauge?.classList.contains('summary-panel__gauge--over')).toBe(true);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('capacity.gauge.overCommitted');
  });

  it('clamps the gauge fill width to 100% even when the ratio exceeds 1 (over-committed)', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.clampedRatio(1.3)).toBe(1);
    expect(fixture.componentInstance.clampedRatio(0.5)).toBe(0.5);
    expect(fixture.componentInstance.clampedRatio(null)).toBe(0);

    const fill = fixture.nativeElement.querySelector('.summary-panel__gauge-fill') as HTMLElement;
    expect(fill.style.width).toBe('90%');
  });
});
