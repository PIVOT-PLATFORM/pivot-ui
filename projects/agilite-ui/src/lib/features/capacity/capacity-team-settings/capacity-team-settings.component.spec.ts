import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityTeamSettingsComponent } from './capacity-team-settings.component';

describe('CapacityTeamSettingsComponent', () => {
  let httpMock: HttpTestingController;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [CapacityTeamSettingsComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ teamId: '42' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('loads the team maturity setting and renders the selector with effective defaults', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityTeamSettingsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`)
      .flush({ teamId: 42, maturity: null, effectiveFocusFactorPercent: 70, effectiveMarginPercent: 15 });
    fixture.detectChanges();

    expect(fixture.componentInstance.setting()).toEqual({
      teamId: 42,
      maturity: null,
      effectiveFocusFactorPercent: 70,
      effectiveMarginPercent: 15,
    });
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(3);
    expect(Array.from(radios).some((r: unknown) => (r as HTMLInputElement).checked)).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('70');
    expect(fixture.nativeElement.textContent).toContain('15');
  });

  it('flags loadError on a failed fetch and offers a retry', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityTeamSettingsComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    fixture.nativeElement.querySelector('button').click();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`)
      .flush({ teamId: 42, maturity: 'NORMING', effectiveFocusFactorPercent: 70, effectiveMarginPercent: 10 });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(false);
  });

  it('selects a maturity tier and updates the effective defaults from the response', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityTeamSettingsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`)
      .flush({ teamId: 42, maturity: null, effectiveFocusFactorPercent: 70, effectiveMarginPercent: 15 });
    fixture.detectChanges();

    fixture.componentInstance.selectMaturity('NORMING');

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ maturity: 'NORMING' });
    req.flush({ teamId: 42, maturity: 'NORMING', effectiveFocusFactorPercent: 70, effectiveMarginPercent: 10 });
    fixture.detectChanges();

    expect(fixture.componentInstance.setting()?.maturity).toBe('NORMING');
    expect(fixture.componentInstance.saving()).toBe(false);
    const checked = fixture.nativeElement.querySelector('input[type="radio"]:checked') as HTMLInputElement;
    expect(checked.value).toBe('NORMING');
  });

  it('flags saveError on a failed update, without clearing the current setting', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityTeamSettingsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`)
      .flush({ teamId: 42, maturity: null, effectiveFocusFactorPercent: 70, effectiveMarginPercent: 15 });
    fixture.detectChanges();

    fixture.componentInstance.selectMaturity('FORMING');
    httpMock.expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.saveError()).toBe(true);
    expect(fixture.componentInstance.setting()?.maturity).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
