import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SESSION_STOMP_CLIENT_FACTORY, StompClient } from '../services/session-ws.service';
import { SessionJoinComponent } from './session-join.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

class FakeRxStomp implements StompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  activateCalls = 0;
  deactivateCalls = 0;
  configure(): void {}
  activate(): void {
    this.activateCalls++;
  }
  deactivate(): Promise<void> {
    this.deactivateCalls++;
    return Promise.resolve();
  }
  watch() {
    return new Subject<{ body: string }>().asObservable();
  }
}

describe('SessionJoinComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  beforeEach(async () => {
    vi.useFakeTimers();
    fake = new FakeRxStomp();
    await TestBed.configureTestingModule({
      imports: [SessionJoinComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => fake },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('pre-fills the code from a ?code= query param, uppercased and truncated', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SessionJoinComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => fake },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ code: 'abcdefgh' }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['form'].controls.code.value).toBe('ABCDEF');
  });

  it('marks all fields touched and does not submit when the form is invalid', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    httpMock.expectNone(`${TEST_API_URL}/sessions/join`);
    expect(fixture.componentInstance['form'].controls.code.touched).toBe(true);
  });

  it('joins, connects the WS link, and navigates to the play route on success', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'abcdef', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance['submitting']()).toBe(true);

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/join`);
    expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: 'Ada' });
    req.flush({
      participantId: 'p-1',
      token: 't-1',
      wsTopic: '/topic/collaboratif/session/s-1',
      sessionId: 's-1',
    });

    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(fake.activateCalls).toBe(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1', 'play']);
  });

  it('sends a heartbeat every 5 minutes after joining', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();
    httpMock.expectOne(`${TEST_API_URL}/sessions/join`).flush({
      participantId: 'p-1',
      token: 't-1',
      wsTopic: '/topic/collaboratif/session/s-1',
      sessionId: 's-1',
    });

    vi.advanceTimersByTime(5 * 60 * 1000);
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/participants/p-1/heartbeat`).flush(null);
  });

  it('disconnects the WS link and reports sessionExpired when a heartbeat fails', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();
    httpMock.expectOne(`${TEST_API_URL}/sessions/join`).flush({
      participantId: 'p-1',
      token: 't-1',
      wsTopic: '/topic/collaboratif/session/s-1',
      sessionId: 's-1',
    });

    vi.advanceTimersByTime(5 * 60 * 1000);
    httpMock
      .expectOne(`${TEST_API_URL}/sessions/s-1/participants/p-1/heartbeat`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance['errorMessageKey']()).toBe('session.join.errors.sessionExpired');
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it('stops the heartbeat and disconnects on destroy', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();
    httpMock.expectOne(`${TEST_API_URL}/sessions/join`).flush({
      participantId: 'p-1',
      token: 't-1',
      wsTopic: '/topic/collaboratif/session/s-1',
      sessionId: 's-1',
    });

    fixture.destroy();
    vi.advanceTimersByTime(5 * 60 * 1000);
    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1/participants/p-1/heartbeat`);
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [404, undefined, 'session.join.errors.notFound'],
    [400, { code: 'INVALID_DISPLAY_NAME' }, 'session.join.errors.invalidDisplayName'],
    [400, { code: 'OTHER' }, 'session.join.errors.invalidRequest'],
    [500, undefined, 'session.join.errors.generic'],
  ] as const)('maps a %s error (%o) to %s', (status, body, expectedKey) => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();

    httpMock.expectOne(`${TEST_API_URL}/sessions/join`).flush(body ?? null, { status, statusText: 'Error' });

    expect(fixture.componentInstance['errorMessageKey']()).toBe(expectedKey);
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });
});
