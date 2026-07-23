import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionResponse } from '../models/session.model';
import { SessionFormComponent } from './session-form.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

const SESSION: SessionResponse = {
  id: 's-1',
  title: 'Sprint retro',
  type: 'POLL',
  status: 'DRAFT',
  joinCode: 'ABCDEF',
  config: {},
  teamId: null,
  participantCount: 0,
  createdAt: '2026-07-22T08:00:00Z',
  startedAt: null,
  endedAt: null,
};

describe('SessionFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('cannot save without a title or a selected type', () => {
    const fixture = TestBed.createComponent(SessionFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.title.set('Sprint retro');
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.selectType('POLL');
    expect(fixture.componentInstance.canSave()).toBe(true);
  });

  it('rejects a title over the max length', () => {
    const fixture = TestBed.createComponent(SessionFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.title.set('a'.repeat(121));
    fixture.componentInstance.selectType('POLL');
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('creates the session and navigates to its detail route on success', () => {
    const fixture = TestBed.createComponent(SessionFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.title.set('Sprint retro');
    fixture.componentInstance.selectType('POLL');
    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.saving()).toBe(true);

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions`);
    expect(req.request.body).toEqual({ title: 'Sprint retro', type: 'POLL', config: {} });
    req.flush(SESSION);

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1']);
  });

  it('surfaces saveError and resets saving on failure', () => {
    const fixture = TestBed.createComponent(SessionFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.title.set('Sprint retro');
    fixture.componentInstance.selectType('POLL');
    fixture.componentInstance.onSubmit();

    httpMock.expectOne(`${TEST_API_URL}/sessions`).flush(null, { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.saveError()).toBe(true);
  });

  it('onSubmit() no-ops when the form is invalid', () => {
    const fixture = TestBed.createComponent(SessionFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    httpMock.expectNone(`${TEST_API_URL}/sessions`);
  });
});
