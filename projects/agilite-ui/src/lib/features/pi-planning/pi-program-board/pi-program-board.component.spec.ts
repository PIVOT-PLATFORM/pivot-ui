import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiBoardResponse, PiTicketResponse } from '../models/pi-planning.model';
import { PiProgramBoardComponent } from './pi-program-board.component';

const ticketA: PiTicketResponse = {
  id: 'tk-a',
  cycleId: 'c-1',
  type: 'FEATURE',
  title: 'Ticket A',
  description: null,
  teamId: null,
  iterationId: null,
  order: 0,
};

const ticketB: PiTicketResponse = {
  id: 'tk-b',
  cycleId: 'c-1',
  type: 'STORY',
  title: 'Ticket B',
  description: null,
  teamId: 't-1',
  iterationId: 'i-1',
  order: 0,
};

const board: PiBoardResponse = {
  cycleId: 'c-1',
  iterations: [{ id: 'i-1', number: 1, label: 'IT1', startDate: '2026-08-01', endDate: '2026-08-14' }],
  teams: [{ id: 't-1', name: 'Squad Phoenix', color: '#3b82f6', order: 0, sourceTeamId: 1 }],
  tickets: [ticketA, ticketB],
  dependencies: [],
};

describe('PiProgramBoardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiProgramBoardComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cycleId: 'c-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(PiProgramBoardComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
    fixture.detectChanges();
    return fixture;
  }

  it('builds rows (Train first) and columns (Unplanned first)', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    expect(component.rows().map(r => r.id)).toEqual([null, 't-1']);
    expect(component.columns().map(c => c.id)).toEqual([null, 'i-1']);
  });

  it('groups tickets by cell', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    expect(component.ticketsFor({ teamId: null, iterationId: null })).toEqual([ticketA]);
    expect(component.ticketsFor({ teamId: 't-1', iterationId: 'i-1' })).toEqual([ticketB]);
  });

  it('sets loadError on a failed fetch', () => {
    const fixture = TestBed.createComponent(PiProgramBoardComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('onDrop() applies an optimistic move then confirms via PATCH', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const previousContainerData = [ticketA];
    const containerData: PiTicketResponse[] = [];
    const event = {
      previousContainer: { data: previousContainerData },
      container: { data: containerData },
      previousIndex: 0,
      currentIndex: 0,
    } as never;

    component.onDrop(event, { teamId: 't-1', iterationId: 'i-1' });
    // Optimistic move already reflected before the PATCH resolves.
    expect(component.ticketsFor({ teamId: 't-1', iterationId: 'i-1' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'tk-a', teamId: 't-1', iterationId: 'i-1' })]),
    );

    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-a`);
    expect(req.request.body).toEqual({ teamId: 't-1', iterationId: 'i-1', order: 1 });
    req.flush({ ...ticketA, teamId: 't-1', iterationId: 'i-1', order: 1 });
  });

  it('onDrop() rolls back the optimistic move on a failed PATCH', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const event = {
      previousContainer: { data: [ticketA] },
      container: { data: [] as PiTicketResponse[] },
      previousIndex: 0,
      currentIndex: 0,
    } as never;

    component.onDrop(event, { teamId: 't-1', iterationId: 'i-1' });
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-a`);
    req.flush({ code: 'INVALID_CELL' }, { status: 400, statusText: 'Bad Request' });

    expect(component.ticketsFor({ teamId: null, iterationId: null })).toEqual([ticketA]);
    expect(component.moveError()).toBe('INVALID_CELL');
  });

  it('onDrop() is a no-op when dropped in the same container', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const sameContainer = { data: [ticketA] };
    const event = { previousContainer: sameContainer, container: sameContainer, previousIndex: 0, currentIndex: 0 } as never;
    component.onDrop(event, { teamId: null, iterationId: null });
    httpMock.expectNone(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-a`);
  });

  it('openCreate() prefills the draft with the target cell and no id', () => {
    const fixture = createFixture();
    fixture.componentInstance.openCreate({ teamId: 't-1', iterationId: 'i-1' });
    expect(fixture.componentInstance.draft()).toEqual(
      expect.objectContaining({ id: null, teamId: 't-1', iterationId: 'i-1', title: '' }),
    );
  });

  it('onTicketClick() outside link mode opens the edit draft for that ticket', () => {
    const fixture = createFixture();
    fixture.componentInstance.onTicketClick(ticketA);
    expect(fixture.componentInstance.draft()).toEqual(
      expect.objectContaining({ id: 'tk-a', title: 'Ticket A' }),
    );
  });

  it('saveDraft() creates a new ticket when id is null', () => {
    const fixture = createFixture();
    fixture.componentInstance.openCreate({ teamId: null, iterationId: null });
    fixture.componentInstance.onDraftTitleInput({ target: { value: 'New ticket' } } as unknown as Event);

    fixture.componentInstance.saveDraft();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(expect.objectContaining({ title: 'New ticket', type: 'STORY' }));
    req.flush(ticketA);

    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
    expect(fixture.componentInstance.draft()).toBeNull();
  });

  it('saveDraft() updates an existing ticket when id is set', () => {
    const fixture = createFixture();
    fixture.componentInstance.onTicketClick(ticketA);
    fixture.componentInstance.onDraftTitleInput({ target: { value: 'Renamed' } } as unknown as Event);

    fixture.componentInstance.saveDraft();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-a`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(expect.objectContaining({ title: 'Renamed' }));
    req.flush(ticketA);
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
  });

  it('deleteDraft() deletes the open ticket and reloads', () => {
    const fixture = createFixture();
    fixture.componentInstance.onTicketClick(ticketA);
    fixture.componentInstance.deleteDraft();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-a`).flush(null);
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
    expect(fixture.componentInstance.draft()).toBeNull();
  });

  it('link mode: first click sets the source, second click on another ticket creates a dependency', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.toggleLinkMode();
    expect(component.linkMode()).toBe(true);

    component.onTicketClick(ticketA);
    expect(component.linkSourceId()).toBe('tk-a');

    component.onTicketClick(ticketB);
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies`);
    expect(req.request.body).toEqual({ fromTicketId: 'tk-a', toTicketId: 'tk-b' });
    req.flush({ id: 'd-1', cycleId: 'c-1', fromTicketId: 'tk-a', toTicketId: 'tk-b', status: 'OK', note: null });
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
    expect(component.linkSourceId()).toBeNull();
  });

  it('link mode: clicking the same ticket twice clears the source without creating a dependency', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.toggleLinkMode();
    component.onTicketClick(ticketA);
    component.onTicketClick(ticketA);
    expect(component.linkSourceId()).toBeNull();
    httpMock.expectNone(`${environment.apiUrl}/pi/cycles/c-1/dependencies`);
  });

  it('link mode: a rejected dependency surfaces the error code', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.toggleLinkMode();
    component.onTicketClick(ticketA);
    component.onTicketClick(ticketB);
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies`);
    req.flush({ code: 'DEPENDENCY_CYCLE' }, { status: 400, statusText: 'Bad Request' });
    expect(component.dependencyError()).toBe('DEPENDENCY_CYCLE');
  });

  it('onUpdateDependency()/onDeleteDependency() forward to the API and reload the board', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.onUpdateDependency('d-1', { status: 'BLOCKED' });
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies/d-1`).flush({});
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);

    component.onDeleteDependency('d-1');
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies/d-1`).flush(null);
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`).flush(board);
  });
});
