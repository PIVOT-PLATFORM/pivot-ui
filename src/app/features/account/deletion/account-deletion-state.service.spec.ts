import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountDeletionStateService } from './account-deletion-state.service';
import { installMemoryLocalStorage } from './testing/memory-local-storage';

const STORAGE_KEY = 'pivot_account_deletion_pending';

describe('AccountDeletionStateService', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    TestBed.configureTestingModule({});
  });

  afterEach(() => window.localStorage.clear());

  it('reports no pending deletion by default', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    expect(service.pending()).toBeNull();
  });

  it('record() sets the signal and persists to localStorage', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    const future = new Date(Date.now() + 86_400_000).toISOString();

    service.record(future);

    expect(service.pending()).toEqual({ effectiveDeletionDate: future });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({ effectiveDeletionDate: future });
  });

  it('clear() resets the signal and removes the localStorage entry', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    service.record(new Date(Date.now() + 86_400_000).toISOString());

    service.clear();

    expect(service.pending()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores a pending deletion recorded in a previous session (localStorage survives reload)', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ effectiveDeletionDate: future }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toEqual({ effectiveDeletionDate: future });
  });

  it('treats an elapsed grace period as no-pending (auto-expires) without needing a network call', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ effectiveDeletionDate: past }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });

  it('ignores malformed localStorage content instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-json{{{');

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });

  it('ignores a well-formed-JSON but wrong-shape localStorage value', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ somethingElse: true }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });

  describe('live auto-expiry (no record()/clear() call in between)', () => {
    afterEach(() => vi.useRealTimers());

    it('flips pending() to null on its own once the grace period elapses in a long-lived tab', () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AccountDeletionStateService);
      service.record(new Date(Date.now() + 5000).toISOString());
      TestBed.flushEffects();

      expect(service.pending()).not.toBeNull();

      // Nothing calls record()/clear() here — this is the exact "banner left
      // open across the deadline" scenario. `computed()` alone (without the
      // `now` signal + scheduled wake-up) would keep returning the stale,
      // already-expired value forever: https://github.com/PIVOT-PLATFORM/pivot-ui/pull/83.
      vi.advanceTimersByTime(5001);

      expect(service.pending()).toBeNull();
    });

    it('correctly schedules across a grace period longer than the ~24.8-day max JS timer delay', () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AccountDeletionStateService);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      service.record(new Date(Date.now() + THIRTY_DAYS_MS).toISOString());
      TestBed.flushEffects();

      expect(service.pending()).not.toBeNull();

      // A single setTimeout(..., THIRTY_DAYS_MS) would silently overflow (32-bit
      // signed ms) and fire near-instantly instead of waiting — assert it does NOT.
      vi.advanceTimersByTime(THIRTY_DAYS_MS - 1000);
      expect(service.pending()).not.toBeNull();

      vi.advanceTimersByTime(2000);
      expect(service.pending()).toBeNull();
    });

    it('cancels the previous wake-up timer when a new deletion is recorded before the first elapses', () => {
      vi.useFakeTimers();
      const service = TestBed.inject(AccountDeletionStateService);
      service.record(new Date(Date.now() + 5000).toISOString());
      TestBed.flushEffects();

      const laterDate = new Date(Date.now() + 20_000).toISOString();
      service.record(laterDate);
      TestBed.flushEffects();

      // Old timer (which would have fired at +5000ms) must not have been left
      // running and incorrectly expiring the newly-recorded, still-pending value.
      vi.advanceTimersByTime(5001);
      expect(service.pending()).toEqual({ effectiveDeletionDate: laterDate });

      vi.advanceTimersByTime(20_000);
      expect(service.pending()).toBeNull();
    });
  });
});
