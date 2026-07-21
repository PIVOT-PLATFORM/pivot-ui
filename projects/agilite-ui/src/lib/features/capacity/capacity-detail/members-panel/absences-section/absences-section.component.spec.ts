import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../../environments/environment';
import { CapacityAbsenceResponse } from '../../../models/capacity.model';
import { AbsencesSectionComponent } from './absences-section.component';

const absence: CapacityAbsenceResponse = {
  id: 'abs-1',
  eventMemberId: 'member-1',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  fraction: 1,
  source: 'Manuelle',
};

describe('AbsencesSectionComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbsencesSectionComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(memberId: string | null = 'member-1', memberName: string | null = 'Ada Lovelace') {
    const fixture = TestBed.createComponent(AbsencesSectionComponent);
    fixture.componentRef.setInput('memberId', memberId);
    fixture.componentRef.setInput('memberName', memberName);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty message when no member is selected', () => {
    const fixture = createFixture(null, null);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('capacity.absences.empty');
    expect(el.querySelector('form')).toBeFalsy();
  });

  it('shows the empty message when the selected member has no absences yet', () => {
    const fixture = createFixture();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('capacity.absences.empty');
  });

  it('adds an absence and emits changed on success', () => {
    const fixture = createFixture();
    const changedSpy = vi.fn();
    fixture.componentInstance.changed.subscribe(changedSpy);

    fixture.componentInstance.form.setValue({
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      fraction: 1,
      source: '',
    });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/members/member-1/absences`);
    expect(req.request.body).toEqual({ startDate: '2026-07-01', endDate: '2026-07-02', fraction: 1 });
    req.flush(absence);
    fixture.detectChanges();

    expect(fixture.componentInstance.absences()).toEqual([absence]);
    expect(changedSpy).toHaveBeenCalledTimes(1);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2026-07-01');
  });

  it('shows a mapped error message when adding fails with a known code', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.setValue({
      startDate: '2026-07-02',
      endDate: '2026-07-01',
      fraction: 1,
      source: '',
    });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/capacity/members/member-1/absences`)
      .flush({ code: 'INVALID_DATE_RANGE' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessageKey()).toBe('capacity.absences.errors.INVALID_DATE_RANGE');
  });

  it('removes an absence after confirmation and emits changed', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.setValue({
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      fraction: 1,
      source: '',
    });
    fixture.componentInstance.onSubmit();
    httpMock.expectOne(`${environment.apiUrl}/capacity/members/member-1/absences`).flush(absence);
    fixture.detectChanges();

    const changedSpy = vi.fn();
    fixture.componentInstance.changed.subscribe(changedSpy);

    fixture.componentInstance.requestRemove(absence);
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingRemove()).toEqual(absence);

    fixture.componentInstance.confirmRemove();
    httpMock.expectOne(`${environment.apiUrl}/capacity/absences/abs-1`).flush(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.absences()).toEqual([]);
    expect(fixture.componentInstance.pendingRemove()).toBeNull();
    expect(changedSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps each member\'s absences separate when switching the selected member', () => {
    const fixture = createFixture('member-1', 'Ada Lovelace');
    fixture.componentInstance.form.setValue({
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      fraction: 1,
      source: '',
    });
    fixture.componentInstance.onSubmit();
    httpMock.expectOne(`${environment.apiUrl}/capacity/members/member-1/absences`).flush(absence);
    fixture.detectChanges();

    fixture.componentRef.setInput('memberId', 'member-2');
    fixture.componentRef.setInput('memberName', 'Grace Hopper');
    fixture.detectChanges();
    expect(fixture.componentInstance.absences()).toEqual([]);

    fixture.componentRef.setInput('memberId', 'member-1');
    fixture.componentRef.setInput('memberName', 'Ada Lovelace');
    fixture.detectChanges();
    expect(fixture.componentInstance.absences()).toEqual([absence]);
  });
});
