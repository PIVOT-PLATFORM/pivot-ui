import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../auth/service/auth.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const mockAuthResponse = {
  accessToken: 'tok',
  expiresAt: Date.now() + 3600_000,
  user: { id: 1, email: 'a@b.com', firstName: 'Alice', lastName: 'Martin', role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'test' },
};

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NavbarComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('userMenuOpen starts as false', () => {
    expect(component.userMenuOpen()).toBe(false);
  });

  describe('initials()', () => {
    it('returns "?" when no user', () => {
      expect(component.initials()).toBe('?');
    });

    it('returns uppercase initials after login', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(component.initials()).toBe('AM');
    });

    it('handles missing lastName', () => {
      const noLastName = { ...mockAuthResponse, user: { ...mockAuthResponse.user, lastName: null } };
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(noLastName);
      expect(component.initials()).toBe('A');
    });
  });

  describe('switchLang()', () => {
    it('stores the new lang in localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      component.switchLang();
      expect(setItemSpy).toHaveBeenCalledWith('pivot_lang', expect.stringMatching(/^(fr|en)$/));
    });
  });

  describe('logout()', () => {
    it('calls auth.logout() and clears session', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);

      component.logout();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
