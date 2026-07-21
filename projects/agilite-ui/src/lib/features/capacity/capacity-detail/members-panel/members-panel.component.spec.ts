import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../environments/environment';
import { CapacityMemberBreakdownResponse, CapacityMemberResponse } from '../../models/capacity.model';
import { MembersPanelComponent } from './members-panel.component';

const members: CapacityMemberBreakdownResponse[] = [
  {
    memberId: 'member-1',
    name: 'Ada Lovelace',
    role: 'Dev',
    quotite: 1,
    excluded: false,
    effectiveFocus: 0.8,
    absentWorkingDays: 0,
    workedDays: 10,
    netCapacity: 8,
    points: null,
    recommendedEngagement: 8,
  },
];

const createdMember: CapacityMemberResponse = {
  id: 'member-2',
  eventId: 'event-1',
  teamMemberRef: null,
  name: 'Grace Hopper',
  role: null,
  quotite: 1,
  focusFactor: null,
  locality: null,
  excluded: false,
  position: 1,
};

describe('MembersPanelComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPanelComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(memberList: readonly CapacityMemberBreakdownResponse[] = members) {
    const fixture = TestBed.createComponent(MembersPanelComponent);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.componentRef.setInput('members', memberList);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty message when there are no members', () => {
    const fixture = createFixture([]);
    expect(fixture.nativeElement.textContent).toContain('capacity.members.empty');
  });

  it('lists the members from the summary breakdown', () => {
    const fixture = createFixture();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ada Lovelace');
  });

  it('adds a member and emits changed on success', () => {
    const fixture = createFixture();
    const changedSpy = vi.fn();
    fixture.componentInstance.changed.subscribe(changedSpy);

    fixture.componentInstance.openAddForm();
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ name: 'Grace Hopper', quotite: 1 });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/members`);
    expect(req.request.body).toMatchObject({ name: 'Grace Hopper', quotite: 1 });
    req.flush(createdMember);
    fixture.detectChanges();

    expect(fixture.componentInstance.addFormOpen()).toBe(false);
    expect(changedSpy).toHaveBeenCalledTimes(1);
  });

  it('shows a mapped error when the add form is invalid server-side', () => {
    const fixture = createFixture();
    fixture.componentInstance.openAddForm();
    fixture.componentInstance.form.patchValue({ name: 'X', quotite: 1 });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/event-1/members`)
      .flush({ code: 'INVALID_QUOTITE' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessageKey()).toBe('capacity.members.errors.INVALID_QUOTITE');
  });

  it('updates a member via updateMember when editing an existing one', () => {
    const fixture = createFixture();
    fixture.componentInstance.openEditForm(members[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('Ada Lovelace');

    fixture.componentInstance.form.patchValue({ name: 'Ada L.' });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/members/member-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...createdMember, id: 'member-1', name: 'Ada L.' });
    fixture.detectChanges();

    expect(fixture.componentInstance.editingMemberId()).toBeNull();
  });

  it('removes a member after confirmation and emits changed, deselecting it if selected', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectMember('member-1');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedMemberId()).toBe('member-1');

    const changedSpy = vi.fn();
    fixture.componentInstance.changed.subscribe(changedSpy);

    fixture.componentInstance.requestRemove(members[0], new Event('click'));
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingRemove()).toEqual(members[0]);

    fixture.componentInstance.confirmRemove();
    httpMock.expectOne(`${environment.apiUrl}/capacity/members/member-1`).flush(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.pendingRemove()).toBeNull();
    expect(fixture.componentInstance.selectedMemberId()).toBeNull();
    expect(changedSpy).toHaveBeenCalledTimes(1);
  });

  it('renders the absences section for the selected member', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectMember('member-1');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-capacity-absences-section')).toBeTruthy();
  });
});
