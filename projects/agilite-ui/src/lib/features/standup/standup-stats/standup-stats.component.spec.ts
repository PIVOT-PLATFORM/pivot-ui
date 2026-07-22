import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { StandupStatsResponse } from '../models/standup.model';
import { StandupStatsComponent } from './standup-stats.component';

const stats: StandupStatsResponse = {
  sessions: [{ id: 's-1', name: 'Daily du 21/07', startedAt: '2026-07-21T08:00:00Z', durationSeconds: 420 }],
  participants: [
    { name: 'Ada', sessionCount: 3, totalSpeakingSeconds: 300 },
    { name: 'Grace', sessionCount: 2, totalSpeakingSeconds: 150 },
  ],
};

describe('StandupStatsComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandupStatsComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ teamId: '1' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(StandupStatsComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/stats`).flush(stats);
    fixture.detectChanges();
    return fixture;
  }

  it('flags loadError when teamId is missing', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StandupStatsComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(StandupStatsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('defaults to the 30-day period and loads stats on init', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.period()).toBe('30d');
    expect(fixture.componentInstance.stats()).toEqual(stats);
  });

  it('scales chart bars relative to the highest total speaking time', () => {
    const fixture = createFixture();
    const bars = fixture.componentInstance.chartBars();
    expect(bars.find(b => b.name === 'Ada')?.widthPercent).toBe(100);
    expect(bars.find(b => b.name === 'Grace')?.widthPercent).toBe(50);
  });

  it('shows the explicit empty state when there is no session or participant in the period', () => {
    const fixture = TestBed.createComponent(StandupStatsComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/stats`).flush({ sessions: [], participants: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.isEmpty()).toBe(true);
  });

  it('reloads with a 7-day range when switching the period shortcut', () => {
    const fixture = createFixture();
    fixture.componentInstance.onPeriodChange({ target: { value: '7d' } } as unknown as Event);
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/stats`);
    req.flush(stats);
    expect(fixture.componentInstance.period()).toBe('7d');
  });

  it('does not auto-reload when switching to the custom period (waits for Apply)', () => {
    const fixture = createFixture();
    fixture.componentInstance.onPeriodChange({ target: { value: 'custom' } } as unknown as Event);
    httpMock.expectNone(r => r.url === `${environment.apiUrl}/standup/stats`);
  });

  it('applies the custom range on demand', () => {
    const fixture = createFixture();
    fixture.componentInstance.onPeriodChange({ target: { value: 'custom' } } as unknown as Event);
    fixture.componentInstance.onCustomFromInput({ target: { value: '2026-07-01' } } as unknown as Event);
    fixture.componentInstance.onCustomToInput({ target: { value: '2026-07-15' } } as unknown as Event);
    fixture.componentInstance.applyCustomRange();
    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/standup/stats` && r.params.get('from') === '2026-07-01' && r.params.get('to') === '2026-07-15',
    );
    req.flush(stats);
  });

  it('flags loadError on a failed stats request (e.g. INVALID_DATE_RANGE)', () => {
    const fixture = TestBed.createComponent(StandupStatsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/standup/stats`)
      .flush({ code: 'INVALID_DATE_RANGE' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });
});
