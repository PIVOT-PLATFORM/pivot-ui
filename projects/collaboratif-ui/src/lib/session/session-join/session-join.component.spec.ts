import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionJoinComponent } from './session-join.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

describe('SessionJoinComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionJoinComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pre-fills the code from a ?code= query param, uppercased and truncated', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SessionJoinComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
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

  it('joins anonymously and navigates to the play route with the guest token/participantId as router state', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'abcdef', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance['submitting']()).toBe(true);

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/join`);
    expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: 'Ada' });
    // No `sessionId` field on the real backend DTO — only derivable from `wsTopic`.
    req.flush({ participantId: 'p-1', token: 't-1', wsTopic: '/topic/collaboratif/session/s-1' });

    expect(fixture.componentInstance['submitting']()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1', 'play'], {
      state: { participantId: 'p-1', guestToken: 't-1' },
    });
  });

  it('joins authenticated (token: null) and still navigates with the derived sessionId', () => {
    const fixture = TestBed.createComponent(SessionJoinComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['form'].setValue({ code: 'abcdef', displayName: 'Ada' });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${TEST_API_URL}/sessions/join`)
      .flush({ participantId: 'p-1', token: null, wsTopic: '/topic/collaboratif/session/s-2' });

    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-2', 'play'], {
      state: { participantId: 'p-1', guestToken: null },
    });
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
