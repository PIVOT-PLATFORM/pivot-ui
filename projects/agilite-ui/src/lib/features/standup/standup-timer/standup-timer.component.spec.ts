import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandupTimerComponent } from './standup-timer.component';

describe('StandupTimerComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T10:00:00.000Z'));
    await TestBed.configureTestingModule({
      imports: [StandupTimerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createFixture(speakingAt: string | null, timePerPersonSeconds: number, extraSeconds = 0) {
    const fixture = TestBed.createComponent(StandupTimerComponent);
    fixture.componentRef.setInput('speakingAt', speakingAt);
    fixture.componentRef.setInput('timePerPersonSeconds', timePerPersonSeconds);
    fixture.componentRef.setInput('extraSeconds', extraSeconds);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the full remaining time when the speaker just started', () => {
    const fixture = createFixture('2026-07-22T10:00:00.000Z', 120);
    expect(fixture.componentInstance.remainingSeconds()).toBe(120);
    expect(fixture.componentInstance.formattedRemaining()).toBe('02:00');
    expect(fixture.componentInstance.isOverdue()).toBe(false);
  });

  it('recomputes the remaining time every second from a local tick, not a server push', () => {
    const fixture = createFixture('2026-07-22T10:00:00.000Z', 120);
    vi.advanceTimersByTime(45_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.remainingSeconds()).toBe(75);
    expect(fixture.componentInstance.formattedRemaining()).toBe('01:15');
  });

  it('switches to the overdue state past the allotted time, without blocking at 0', () => {
    const fixture = createFixture('2026-07-22T09:59:00.000Z', 30);
    fixture.detectChanges();
    expect(fixture.componentInstance.isOverdue()).toBe(true);
    expect(fixture.componentInstance.remainingSeconds()).toBe(-30);
    expect(fixture.componentInstance.formattedRemaining()).toBe('-00:30');
    expect(fixture.componentInstance.dashOffset()).toBe(0);
  });

  it('accounts for extraSeconds granted via extend (US10.2.2) in the total duration', () => {
    const fixture = createFixture('2026-07-22T09:58:30.000Z', 60, 60);
    fixture.detectChanges();
    // elapsed 90s, total 60 + 60 = 120s -> not overdue, 30s remaining
    expect(fixture.componentInstance.isOverdue()).toBe(false);
    expect(fixture.componentInstance.remainingSeconds()).toBe(30);
  });

  it('renders 0 elapsed when no one is currently speaking (speakingAt null)', () => {
    const fixture = createFixture(null, 120);
    expect(fixture.componentInstance.remainingSeconds()).toBe(120);
    expect(fixture.componentInstance.isOverdue()).toBe(false);
  });

  it('stops updating once the component is destroyed (no leaked interval)', () => {
    const fixture = createFixture('2026-07-22T10:00:00.000Z', 120);
    fixture.destroy();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
