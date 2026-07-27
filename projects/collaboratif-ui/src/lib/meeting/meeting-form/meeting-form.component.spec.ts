import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingResponse } from '../models/meeting.model';
import { MeetingFormComponent } from './meeting-form.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BASE = `${TEST_API_URL}/meetings`;

const MEETING: MeetingResponse = {
  id: 'm-1',
  title: 'Sprint Review',
  status: 'DRAFT',
  scheduledAt: '2026-08-01T10:00:00Z',
  totalDurationMinutes: 60,
  teamId: null,
  agendaItems: [],
  createdAt: '2026-07-27T08:00:00Z',
};

function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('MeetingFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeetingFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function fillMinimalValidForm(component: MeetingFormComponent): void {
    component.onTitleInput(inputEvent('Sprint Review'));
    component.onScheduledAtInput(inputEvent('2026-08-01T10:00'));
    component.onTotalDurationInput(inputEvent('60'));
  }

  it('cannot save with a blank form', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('can save once title, scheduledAt and totalDurationMinutes are all valid', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    fillMinimalValidForm(fixture.componentInstance);
    expect(fixture.componentInstance.canSave()).toBe(true);
  });

  it('rejects a title over 200 characters', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    fillMinimalValidForm(fixture.componentInstance);
    fixture.componentInstance.onTitleInput(inputEvent('a'.repeat(201)));
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('rejects a totalDurationMinutes of 0 or above 1440', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    fillMinimalValidForm(fixture.componentInstance);

    fixture.componentInstance.onTotalDurationInput(inputEvent('0'));
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.onTotalDurationInput(inputEvent('1441'));
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.onTotalDurationInput(inputEvent('1440'));
    expect(fixture.componentInstance.canSave()).toBe(true);
  });

  it('adds/removes agenda items and reorders them with moveUp/moveDown', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.addAgendaItem();
    component.addAgendaItem();
    expect(component.agendaItems().length).toBe(2);
    const [first, second] = component.agendaItems();

    component.updateItemTitle(first.key, inputEvent('Point A'));
    component.updateItemTitle(second.key, inputEvent('Point B'));
    expect(component.agendaItems().map(i => i.title)).toEqual(['Point A', 'Point B']);

    component.moveDown(0);
    expect(component.agendaItems().map(i => i.title)).toEqual(['Point B', 'Point A']);

    component.moveUp(1);
    expect(component.agendaItems().map(i => i.title)).toEqual(['Point A', 'Point B']);

    // no-op past the bounds
    component.moveUp(0);
    component.moveDown(1);
    expect(component.agendaItems().map(i => i.title)).toEqual(['Point A', 'Point B']);

    component.removeAgendaItem(first.key);
    expect(component.agendaItems().map(i => i.title)).toEqual(['Point B']);
  });

  it('cannot save when an agenda item has a blank title or non-positive duration', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.addAgendaItem();
    expect(component.canSave()).toBe(false);

    const [item] = component.agendaItems();
    component.updateItemTitle(item.key, inputEvent('Point A'));
    component.updateItemDuration(item.key, inputEvent('0'));
    expect(component.canSave()).toBe(false);

    component.updateItemDuration(item.key, inputEvent('10'));
    expect(component.canSave()).toBe(true);
  });

  it('creates the meeting, resets the form, and shows the confirmation on success', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);

    component.save();
    expect(component.saving()).toBe(true);

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('Sprint Review');
    expect(req.request.body.totalDurationMinutes).toBe(60);
    expect(typeof req.request.body.scheduledAt).toBe('string');
    expect(req.request.body.agendaItems).toEqual([]);
    req.flush(MEETING);

    expect(component.saving()).toBe(false);
    expect(component.created()).toEqual(MEETING);
    expect(component.title()).toBe('');
    expect(component.agendaItems()).toEqual([]);
  });

  it('omits facilitator from the request when left blank, includes it when filled', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.addAgendaItem();
    const [item] = component.agendaItems();
    component.updateItemTitle(item.key, inputEvent('Point A'));
    component.updateItemDuration(item.key, inputEvent('10'));

    component.save();
    const req = httpMock.expectOne(BASE);
    expect(req.request.body.agendaItems[0].facilitator).toBeUndefined();
    req.flush(MEETING);
  });

  it('surfaces the AC3 duration mismatch on the created meeting', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.save();

    httpMock.expectOne(BASE).flush({
      ...MEETING,
      agendaDurationMismatch: { expectedMinutes: 60, sumMinutes: 10, deltaMinutes: -50 },
    });

    expect(component.created()?.agendaDurationMismatch).toEqual({
      expectedMinutes: 60,
      sumMinutes: 10,
      deltaMinutes: -50,
    });
  });

  it('surfaces a field error code on 400', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.save();

    httpMock.expectOne(BASE).flush({ code: 'INVALID_TITLE' }, { status: 400, statusText: 'Bad Request' });

    expect(component.fieldErrorCode()).toBe('INVALID_TITLE');
    expect(component.saving()).toBe(false);
  });

  it('surfaces moduleDisabled on 403', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.save();

    httpMock.expectOne(BASE).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(component.moduleDisabled()).toBe(true);
  });

  it('falls back to a network error banner when the response carries no error code', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.save();

    httpMock.expectOne(BASE).flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(component.saveNetworkError()).toBe(true);
  });

  it('save() no-ops when the form is invalid', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.save();
    httpMock.expectNone(BASE);
  });

  it('dismissConfirmation() clears the created meeting, returning to a blank form', () => {
    const fixture = TestBed.createComponent(MeetingFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fillMinimalValidForm(component);
    component.save();
    httpMock.expectOne(BASE).flush(MEETING);
    expect(component.created()).not.toBeNull();

    component.dismissConfirmation();
    expect(component.created()).toBeNull();
  });
});
