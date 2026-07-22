import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { TeamMemberResponse } from '../models/standup.model';
import { StandupFormComponent } from './standup-form.component';

const members: TeamMemberResponse[] = [
  { id: 10, userId: 100, displayName: 'Ada Lovelace' },
  { id: 11, userId: 101, displayName: 'Grace Hopper' },
];

describe('StandupFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandupFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ teamId: '1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(StandupFormComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams/1/members`).flush(members);
    fixture.detectChanges();
    return fixture;
  }

  it('flags loadError when teamId is missing from the route', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StandupFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(StandupFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('defaults timePerPersonSeconds to 120', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.timePerPersonSeconds()).toBe(120);
  });

  it('cannot save with no name or no selected participant', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.canSave()).toBe(false);
    fixture.componentInstance.onNameInput({ target: { value: 'Daily' } } as unknown as Event);
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('adds a checked member to the rotation in checklist order and removes on uncheck', () => {
    const fixture = createFixture();
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[1], { target: { checked: true } } as unknown as Event);
    expect(fixture.componentInstance.selected().map(p => p.teamMemberId)).toEqual([10, 11]);

    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: false } } as unknown as Event);
    expect(fixture.componentInstance.selected().map(p => p.teamMemberId)).toEqual([11]);
  });

  it('reorders selected participants with moveUp/moveDown', () => {
    const fixture = createFixture();
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[1], { target: { checked: true } } as unknown as Event);

    fixture.componentInstance.moveDown(0);
    expect(fixture.componentInstance.selected().map(p => p.teamMemberId)).toEqual([11, 10]);

    fixture.componentInstance.moveUp(1);
    expect(fixture.componentInstance.selected().map(p => p.teamMemberId)).toEqual([10, 11]);

    // no-op past the bounds
    fixture.componentInstance.moveUp(0);
    fixture.componentInstance.moveDown(1);
    expect(fixture.componentInstance.selected().map(p => p.teamMemberId)).toEqual([10, 11]);
  });

  it('shuffle keeps the same set of participants (order may or may not change)', () => {
    const fixture = createFixture();
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[1], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.shuffle();
    const ids = fixture.componentInstance.selected().map(p => p.teamMemberId);
    expect(ids.sort()).toEqual([10, 11]);
  });

  it('submits and navigates to the created session on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.onNameInput({ target: { value: 'Daily du 22/07' } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions`);
    expect(req.request.body).toEqual({
      teamId: 1,
      name: 'Daily du 22/07',
      timePerPersonSeconds: 120,
      participantTeamMemberIds: [10],
    });
    req.flush({ id: 'new-session' });

    expect(router.navigate).toHaveBeenCalledWith(['/standup/sessions', 'new-session']);
  });

  it('surfaces INVALID_NAME as a field error', () => {
    const fixture = createFixture();
    fixture.componentInstance.onNameInput({ target: { value: 'Daily' } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.save();

    httpMock
      .expectOne(`${environment.apiUrl}/standup/sessions`)
      .flush({ code: 'INVALID_NAME' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.fieldErrorCode()).toBe('INVALID_NAME');
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('falls back to a network error banner when the response carries no error code', () => {
    const fixture = createFixture();
    fixture.componentInstance.onNameInput({ target: { value: 'Daily' } } as unknown as Event);
    fixture.componentInstance.onMemberToggle(members[0], { target: { checked: true } } as unknown as Event);
    fixture.componentInstance.save();

    httpMock.expectOne(`${environment.apiUrl}/standup/sessions`).flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(fixture.componentInstance.saveNetworkError()).toBe(true);
  });
});
