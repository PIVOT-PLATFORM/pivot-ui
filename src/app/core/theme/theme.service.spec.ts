import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

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
    // 'persists the theme to localStorage' spies on Storage.prototype.setItem — a truly
    // global, shared-across-files prototype (unlike DI-scoped spies elsewhere in this repo,
    // discarded when TestBed resets). Left un-restored, it can leak into whichever spec file
    // Vitest schedules next in the same worker, causing order-dependent CI flakiness (observed:
    // green locally, red in CI depending on worker/file scheduling) without ever touching this
    // file's own assertions.
    vi.restoreAllMocks();
    // Still observed failing within THIS file alone ("persists the theme to localStorage",
    // 0 calls recorded) even with the line above: some tests call
    // TestBed.resetTestingModule() mid-test to inject a second ThemeService instance
    // (initial-resolution / effect-side-effects scenarios) — without resetting here too, the
    // next test's beforeEach can reuse that already-reset (or not-yet-reset) TestBed/injector
    // state instead of a guaranteed-fresh one, making the outcome depend on execution order.
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
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      service.setTheme('dark');
      TestBed.flushEffects();
      expect(setItemSpy).toHaveBeenCalledWith('pivot_theme', 'dark');
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
