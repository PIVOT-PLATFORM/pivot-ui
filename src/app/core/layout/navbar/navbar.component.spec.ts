import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { NavbarComponent, avatarColor } from './navbar.component';
import { AuthService } from '../../auth/service/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const mockAuthResponse = {
  accessToken: 'tok',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'alexandre.solane@example.com',
    firstName: 'Alexandre',
    lastName: 'Solane',
    role: 'USER',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'test',
  },
};

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
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
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); });

  it('creates the component', () => { expect(component).toBeTruthy(); });
  it('userMenuOpen starts as false', () => { expect(component.userMenuOpen()).toBe(false); });
  it('notifOpen starts as false', () => { expect(component.notifOpen()).toBe(false); });
  it('notifCount starts at 0', () => { expect(component.notifCount()).toBe(0); });

  describe('initials()', () => {
    it('returns "?" when no user', () => { expect(component.initials()).toBe('?'); });

    it('returns "AS" for Alexandre Solane', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(component.initials()).toBe('AS');
    });

    it('handles null lastName', () => {
      const noLast = { ...mockAuthResponse, user: { ...mockAuthResponse.user, lastName: null } };
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(noLast);
      expect(component.initials()).toBe('A');
    });

    it('falls back to email initial when name is empty', () => {
      const noName = { ...mockAuthResponse, user: { ...mockAuthResponse.user, firstName: null, lastName: null, email: 'z@example.com' } };
      authService.login({ email: 'z@example.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(noName);
      expect(component.initials()).toBe('Z');
    });
  });

  describe('avatarColor()', () => {
    it('returns a valid hex color', () => { expect(avatarColor('Alexandre Solane')).toMatch(/^#[0-9A-Fa-f]{6}$/); });
    it('is deterministic', () => { expect(avatarColor('Alice Dupont')).toBe(avatarColor('Alice Dupont')); });
    it('differs for different names', () => { expect(avatarColor('Alice')).not.toBe(avatarColor('Bob')); });
  });

  describe('userMenuOpen toggle', () => {
    it('opens on toggleUserMenu', () => {
      const e = new MouseEvent('click');
      vi.spyOn(e, 'stopPropagation');
      component.toggleUserMenu(e);
      expect(component.userMenuOpen()).toBe(true);
    });

    it('closes on second call', () => {
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      component.toggleUserMenu(e);
      expect(component.userMenuOpen()).toBe(false);
    });

    it('closes notif when user menu opens', () => {
      component.notifOpen.set(true);
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      expect(component.notifOpen()).toBe(false);
    });
  });

  describe('theme cycling', () => {
    it('advances light to dark', () => {
      themeService.setTheme('light'); TestBed.flushEffects();
      component.cycleTheme(); TestBed.flushEffects();
      expect(component.theme()).toBe('dark');
    });

    it('wraps ocean to light', () => {
      themeService.setTheme('ocean'); TestBed.flushEffects();
      component.cycleTheme(); TestBed.flushEffects();
      expect(component.theme()).toBe('light');
    });

    it('setTheme sets specific theme', () => {
      component.setTheme('ocean'); TestBed.flushEffects();
      expect(component.theme()).toBe('ocean');
    });
  });

  describe('logout()', () => {
    it('clears session after logout', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      component.logout();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('onDocumentClick()', () => {
    it('closes user menu', () => { component.userMenuOpen.set(true); component.onDocumentClick(); expect(component.userMenuOpen()).toBe(false); });
    it('closes notif dropdown', () => { component.notifOpen.set(true); component.onDocumentClick(); expect(component.notifOpen()).toBe(false); });
  });
});
