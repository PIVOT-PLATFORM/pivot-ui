import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { NotificationService, POLL_INTERVAL_MS } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/notifications/unread-count`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('unreadCount starts at 0 and hasError starts at false', () => {
    expect(service.unreadCount()).toBe(0);
    expect(service.hasError()).toBe(false);
  });

  describe('fetchUnreadCount()', () => {
    it('issues a GET to /notifications/unread-count', () => {
      service.fetchUnreadCount().subscribe();
      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 0 });
    });

    it('never sends userId/tenantId — no query params, no body (isolation tenant, CLAUDE.md)', () => {
      service.fetchUnreadCount().subscribe();
      const req = httpMock.expectOne(url);
      expect(req.request.params.keys()).toHaveLength(0);
      expect(req.request.body).toBeNull();
      req.flush({ count: 0 });
    });

    it('updates unreadCount from the response body on success', () => {
      service.fetchUnreadCount().subscribe();
      httpMock.expectOne(url).flush({ count: 7 });
      expect(service.unreadCount()).toBe(7);
      expect(service.hasError()).toBe(false);
    });

    it('resolves the emitted value with the count', () => {
      let emitted: number | undefined;
      service.fetchUnreadCount().subscribe(count => (emitted = count));
      httpMock.expectOne(url).flush({ count: 42 });
      expect(emitted).toBe(42);
    });

    it('clears a previous hasError on a subsequent success', () => {
      vi.useFakeTimers();
      // First call: exhausts all retries, ends in error.
      let completed = false;
      service.fetchUnreadCount().subscribe({ complete: () => (completed = true) });
      for (let i = 0; i < 3; i++) {
        if (i > 0) vi.advanceTimersByTime(1000 * 2 ** (i - 1));
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
      }
      expect(completed).toBe(true);
      expect(service.hasError()).toBe(true);

      // Second call succeeds — hasError must clear.
      service.fetchUnreadCount().subscribe();
      httpMock.expectOne(url).flush({ count: 2 });
      expect(service.hasError()).toBe(false);
      expect(service.unreadCount()).toBe(2);
    });

    describe('error handling — AC "réessai automatique avec backoff exponentiel (max 3 tentatives)"', () => {
      it('never errors the subscriber — resolves 0 and sets hasError after exhausting retries', () => {
        vi.useFakeTimers();
        let completed = false;
        let errored = false;
        let emitted: number | undefined;

        service.fetchUnreadCount().subscribe({
          next: v => (emitted = v),
          complete: () => (completed = true),
          error: () => (errored = true),
        });

        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(1000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(2000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });

        expect(errored).toBe(false);
        expect(completed).toBe(true);
        expect(emitted).toBe(0);
        expect(service.hasError()).toBe(true);
      });

      it('attempts exactly 3 total requests before giving up (1 initial + 2 retries)', () => {
        vi.useFakeTimers();
        service.fetchUnreadCount().subscribe();

        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(1000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(2000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });

        // A 4th tick must NOT issue any further request — the cap is 3 total attempts.
        vi.advanceTimersByTime(4000);
        httpMock.expectNone(url);
      });

      it('does not retry before the exponential backoff delay elapses (1s then 2s)', () => {
        vi.useFakeTimers();
        service.fetchUnreadCount().subscribe();

        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });

        // Just under 1s — the first retry must not have fired yet.
        vi.advanceTimersByTime(999);
        httpMock.expectNone(url);

        // Crossing the 1s mark — first retry fires.
        vi.advanceTimersByTime(1);
        const retry1 = httpMock.expectOne(url);
        retry1.flush('error', { status: 500, statusText: 'Internal Server Error' });

        // Just under 2s — the second retry must not have fired yet.
        vi.advanceTimersByTime(1999);
        httpMock.expectNone(url);

        // Crossing the 2s mark — second (and last) retry fires.
        vi.advanceTimersByTime(1);
        httpMock.expectOne(url).flush({ count: 1 });
      });

      it('recovers if a retry succeeds before the attempt cap is reached', () => {
        vi.useFakeTimers();
        let emitted: number | undefined;
        service.fetchUnreadCount().subscribe(v => (emitted = v));

        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(1000);
        httpMock.expectOne(url).flush({ count: 3 });

        expect(emitted).toBe(3);
        expect(service.hasError()).toBe(false);
        expect(service.unreadCount()).toBe(3);
      });

      it('keeps the last known unreadCount when all retries are exhausted (hasError hides it downstream)', () => {
        service.fetchUnreadCount().subscribe();
        httpMock.expectOne(url).flush({ count: 5 });
        expect(service.unreadCount()).toBe(5);

        vi.useFakeTimers();
        service.fetchUnreadCount().subscribe();
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(1000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
        vi.advanceTimersByTime(2000);
        httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });

        expect(service.unreadCount()).toBe(5);
        expect(service.hasError()).toBe(true);
      });

      it('also retries on a network failure (status 0), not just HTTP error statuses', () => {
        vi.useFakeTimers();
        let completed = false;
        service.fetchUnreadCount().subscribe({ complete: () => (completed = true) });

        httpMock.expectOne(url).error(new ProgressEvent('network-error'));
        vi.advanceTimersByTime(1000);
        httpMock.expectOne(url).error(new ProgressEvent('network-error'));
        vi.advanceTimersByTime(2000);
        httpMock.expectOne(url).error(new ProgressEvent('network-error'));

        expect(completed).toBe(true);
        expect(service.hasError()).toBe(true);
      });
    });
  });

  describe('poll()', () => {
    it('does not issue any request before the first interval elapses', () => {
      vi.useFakeTimers();
      service.poll().subscribe();
      vi.advanceTimersByTime(POLL_INTERVAL_MS - 1);
      httpMock.expectNone(url);
    });

    it('issues a GET on each 30s tick and updates unreadCount', () => {
      vi.useFakeTimers();
      const emitted: number[] = [];
      service.poll().subscribe(count => emitted.push(count));

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      httpMock.expectOne(url).flush({ count: 1 });
      expect(emitted).toEqual([1]);

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      httpMock.expectOne(url).flush({ count: 4 });
      expect(emitted).toEqual([1, 4]);

      // No stray request between ticks.
      vi.advanceTimersByTime(POLL_INTERVAL_MS - 1);
      httpMock.expectNone(url);
    });

    it('keeps polling (does not complete) even after a tick exhausts all retries', () => {
      vi.useFakeTimers();
      let completed = false;
      service.poll().subscribe({ complete: () => (completed = true) });

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(1000);
      httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(2000);
      httpMock.expectOne(url).flush('error', { status: 500, statusText: 'Internal Server Error' });
      expect(service.hasError()).toBe(true);
      expect(completed).toBe(false);

      // The outer poll() interval must still be alive for the next 30s tick.
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      httpMock.expectOne(url).flush({ count: 9 });
      expect(service.hasError()).toBe(false);
      expect(service.unreadCount()).toBe(9);
    });
  });
});
