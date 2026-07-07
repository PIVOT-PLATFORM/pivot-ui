import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { HeaderComponent } from './header.component';
import { AuthService } from '../auth/auth.service';
import { PIVOT_API_URL } from '../config/tokens';

@Component({ template: '', standalone: true }) class FakePageComponent {}

const API = 'http://api.test';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: FakePageComponent }]),
        { provide: PIVOT_API_URL, useValue: API },
      ],
    }).compileComponents();
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HeaderComponent);
  });

  afterEach(() => httpMock.verify());

  it('renders a header element', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('header')).toBeTruthy();
  });

  it('shows no logout button when unauthenticated', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.piv-header__logout')).toBeNull();
  });

  it('shows user name and logout button after login', () => {
    auth.refresh().subscribe();
    httpMock.expectOne(`${API}/auth/refresh`).flush({
      accessToken: 'tok',
      expiresAt: Date.now() + 3_600_000,
      user: {
        id: 1, email: 'alice@test.com', firstName: 'Alice', lastName: 'M',
        role: 'ROLE_USER', emailVerified: true, tenantId: 1, tenantSlug: 'acme',
      },
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alice');
    expect(el.querySelector('.piv-header__logout')).toBeTruthy();
  });

  it('shows PIVOT logo link', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const logoLink = el.querySelector('.piv-header__logo');
    expect(logoLink).toBeTruthy();
    expect((logoLink as HTMLAnchorElement).getAttribute('aria-label')).toBe('PIVOT — home');
  });

  it('logout button calls auth.logout()', () => {
    auth.refresh().subscribe();
    httpMock.expectOne(`${API}/auth/refresh`).flush({
      accessToken: 'tok',
      expiresAt: Date.now() + 3_600_000,
      user: {
        id: 1, email: 'alice@test.com', firstName: 'Alice', lastName: 'M',
        role: 'ROLE_USER', emailVerified: true, tenantId: 1, tenantSlug: 'acme',
      },
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector<HTMLButtonElement>('.piv-header__logout');
    btn?.click();
    fixture.detectChanges();
    httpMock.expectOne(`${API}/auth/logout`).flush(null);
    expect(auth.isAuthenticated()).toBe(false);
  });
});
