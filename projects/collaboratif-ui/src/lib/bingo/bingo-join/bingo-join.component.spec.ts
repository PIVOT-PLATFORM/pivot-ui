import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';
import { BingoJoinComponent } from './bingo-join.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

function configureTestBed(bearerToken: (() => string | null) | null = null): void {
  TestBed.configureTestingModule({
    imports: [BingoJoinComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ...(bearerToken ? [{ provide: COLLABORATIF_BEARER_TOKEN, useValue: bearerToken }] : []),
    ],
  });
}

describe('BingoJoinComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  describe('anonymous caller (no bearer token, AC-47.1.1-03/17)', () => {
    beforeEach(async () => {
      configureTestBed();
      await TestBed.compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('requires a displayName and rejects a too-short one', () => {
      const fixture = TestBed.createComponent(BingoJoinComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance['isAnonymous']).toBe(true);

      fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'A' });
      expect(fixture.componentInstance['form'].invalid).toBe(true);
    });

    it('joins with the trimmed displayName sent to the backend', () => {
      const fixture = TestBed.createComponent(BingoJoinComponent);
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance['form'].setValue({ code: 'abcdef', displayName: ' Guest Alice ' });
      fixture.componentInstance.onSubmit();

      const req = httpMock.expectOne(`${TEST_API_URL}/bingo/rooms/join`);
      expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: 'Guest Alice' });
      req.flush({
        roomId: 'r-1',
        code: null,
        name: 'Room',
        status: 'OPEN',
        maxPlayers: 50,
        expiresAt: '2026-07-28T08:00:00Z',
        wsTopic: '/topic/collaboratif/bingo/r-1',
        accessToken: 'token-1',
        role: 'PLAYER',
        grid: { cells: [] },
      });

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/bingo', 'r-1'],
        expect.objectContaining({ state: expect.objectContaining({ roomId: 'r-1', isAnonymous: true }) }),
      );
    });

    it.each([
      [404, undefined, 'bingo.join.errors.notFound'],
      [400, { code: 'INVALID_DISPLAY_NAME' }, 'bingo.join.errors.invalidDisplayName'],
      [400, { code: 'INVALID_CODE' }, 'bingo.join.errors.invalidCode'],
      [400, { code: 'OTHER' }, 'bingo.join.errors.invalidRequest'],
      [500, undefined, 'bingo.join.errors.generic'],
    ] as const)('maps a %s error (%o) to %s', (status, body, expectedKey) => {
      const fixture = TestBed.createComponent(BingoJoinComponent);
      fixture.detectChanges();
      fixture.componentInstance['form'].setValue({ code: 'ABCDEF', displayName: 'Ada Guest' });
      fixture.componentInstance.onSubmit();

      httpMock.expectOne(`${TEST_API_URL}/bingo/rooms/join`).flush(body ?? null, { status, statusText: 'Error' });

      expect(fixture.componentInstance['errorMessageKey']()).toBe(expectedKey);
      expect(fixture.componentInstance['submitting']()).toBe(false);
    });
  });

  describe('authenticated caller (bearer token present, AC-47.1.1-02/17)', () => {
    beforeEach(async () => {
      configureTestBed(() => 'bearer-abc');
      await TestBed.compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('does not require a displayName and never sends one, even if typed', () => {
      const fixture = TestBed.createComponent(BingoJoinComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance['isAnonymous']).toBe(false);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance['form'].controls.code.setValue('ABCDEF');
      expect(fixture.componentInstance['form'].valid).toBe(true);

      fixture.componentInstance.onSubmit();
      const req = httpMock.expectOne(`${TEST_API_URL}/bingo/rooms/join`);
      expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: undefined });
      req.flush({
        roomId: 'r-2',
        code: null,
        name: 'Room',
        status: 'OPEN',
        maxPlayers: 50,
        expiresAt: '2026-07-28T08:00:00Z',
        wsTopic: '/topic/collaboratif/bingo/r-2',
        accessToken: 'token-2',
        role: 'PLAYER',
        grid: { cells: [] },
      });

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/bingo', 'r-2'],
        expect.objectContaining({ state: expect.objectContaining({ roomId: 'r-2', isAnonymous: false }) }),
      );
    });
  });
});
