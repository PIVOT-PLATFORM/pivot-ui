import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiCycleResponse } from '../models/pi-planning.model';
import { PiCycleFormComponent } from './pi-cycle-form.component';

const cycle: PiCycleResponse = {
  id: 'c-1',
  tenantId: 1,
  name: 'PI 2026.Q3',
  artName: null,
  status: 'PREPARATION',
  startDate: '2026-08-01',
  endDate: '2026-10-10',
  eventDay1: null,
  eventDay2: null,
  eventLocation: null,
  createdBy: 1,
  iterations: [],
  teams: [],
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

describe('PiCycleFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiCycleFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  it('applies the default iteration count/weeks (5/2)', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.iterationCount()).toBe(5);
    expect(fixture.componentInstance.iterationWeeks()).toBe(2);
  });

  it('disables save until name and startDate are filled', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.name.set('PI 2026.Q3');
    expect(fixture.componentInstance.canSave()).toBe(false);

    fixture.componentInstance.startDate.set('2026-08-01');
    expect(fixture.componentInstance.canSave()).toBe(true);
  });

  it('clamps iteration count to [1, 12] and weeks to [1, 6]', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.onIterationCountInput({ target: { value: '99' } } as unknown as Event);
    expect(component.iterationCount()).toBe(12);
    // '-3' (not '0'): a parsed 0 is falsy and falls back to the default via `|| DEFAULT`,
    // same precedent as standup-form's onTimeInput — a genuinely negative value is what
    // exercises the Math.max floor instead.
    component.onIterationCountInput({ target: { value: '-3' } } as unknown as Event);
    expect(component.iterationCount()).toBe(1);

    component.onIterationWeeksInput({ target: { value: '99' } } as unknown as Event);
    expect(component.iterationWeeks()).toBe(6);
    component.onIterationWeeksInput({ target: { value: '-3' } } as unknown as Event);
    expect(component.iterationWeeks()).toBe(1);
  });

  it('creates a cycle and navigates to its detail on success', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.name.set('PI 2026.Q3');
    fixture.componentInstance.startDate.set('2026-08-01');

    fixture.componentInstance.save();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles`);
    expect(req.request.body).toEqual({
      name: 'PI 2026.Q3',
      startDate: '2026-08-01',
      iterationCount: 5,
      iterationWeeks: 2,
    });
    req.flush(cycle);

    expect(router.navigate).toHaveBeenCalledWith(['/pi', 'c-1']);
  });

  it('surfaces a field error code from a 400 response without navigating', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.name.set('PI 2026.Q3');
    fixture.componentInstance.startDate.set('2026-08-01');

    fixture.componentInstance.save();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles`);
    req.flush({ code: 'INVALID_NAME' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.fieldErrorCode()).toBe('INVALID_NAME');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('canSave() stays false for a whitespace-only name (never reaches the API)', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.name.set('   ');
    fixture.componentInstance.startDate.set('2026-08-01');
    expect(fixture.componentInstance.canSave()).toBe(false);
    fixture.componentInstance.save();
    httpMock.expectNone(`${environment.apiUrl}/pi/cycles`);
  });

  it('sets saveNetworkError on a network failure with no error code', () => {
    const fixture = TestBed.createComponent(PiCycleFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.name.set('PI 2026.Q3');
    fixture.componentInstance.startDate.set('2026-08-01');

    fixture.componentInstance.save();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.saveNetworkError()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
