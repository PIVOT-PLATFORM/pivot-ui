import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { ensureLocalStorageStub } from '../i18n/testing/local-storage-stub';

ensureLocalStorageStub();

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
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

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);

    // Flush the initial effect so it runs before assertions
    TestBed.flushEffects();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Some tests call TestBed.resetTestingModule() mid-test to inject a second ThemeService
    // instance (initial-resolution / effect-side-effects scenarios) — without resetting here
    // too, the next test's beforeEach can reuse that already-reset (or not-yet-reset)
    // TestBed/injector state instead of a guaranteed-fresh one, making the outcome depend on
    // execution order.
    TestBed.resetTestingModule();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('initial theme resolution', () => {
    it('uses stored theme from localStorage when valid', () => {
      localStorage.setItem('pivot_theme', 'dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const s = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      expect(s.theme()).toBe('dark');
    });

    it('ignores invalid stored value and falls back', () => {
      localStorage.setItem('pivot_theme', 'invalid-theme');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const fallback = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      expect(['light', 'dark']).toContain(fallback.theme());
    });
  });

  describe('setTheme()', () => {
    it('updates the theme signal', () => {
      service.setTheme('dark');
      TestBed.flushEffects();
      expect(service.theme()).toBe('dark');
    });

    it('sets data-theme attribute on <html> for non-light themes', () => {
      service.setTheme('dark');
      TestBed.flushEffects();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('removes data-theme attribute when theme is light', () => {
      service.setTheme('dark');
      TestBed.flushEffects();
      service.setTheme('light');
      TestBed.flushEffects();
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });

    it('persists the theme to localStorage', () => {
      // Asserts against the actual persisted value rather than spying on
      // Storage.prototype.setItem: that prototype is shared across spec files within a Vitest
      // worker, and a spy's call-tracking there proved order-dependent in CI (observed 0 calls
      // recorded despite the write genuinely happening) depending on file/worker scheduling.
      // Reading the value back is unaffected by any of that.
      service.setTheme('dark');
      TestBed.flushEffects();
      expect(localStorage.getItem('pivot_theme')).toBe('dark');
    });
  });

  describe('toggleTheme()', () => {
    it('toggles light → dark → light', () => {
      service.setTheme('light');
      TestBed.flushEffects();

      service.toggleTheme();
      TestBed.flushEffects();
      expect(service.theme()).toBe('dark');

      service.toggleTheme();
      TestBed.flushEffects();
      expect(service.theme()).toBe('light');
    });
  });

  describe('effect side-effects', () => {
    it('applies correct data-theme when service is created with stored dark preference', () => {
      localStorage.setItem('pivot_theme', 'dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const darkService = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      expect(darkService.theme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
