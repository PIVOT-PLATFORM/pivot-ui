import { Routes, provideRouter } from '@angular/router';
import { InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../auth/service/auth.service';

const FAKE_COLLABORATIF_ROUTES: Routes = [{ path: '', loadComponent: () => Promise.resolve(class {}) }];
const FAKE_TOKEN = new InjectionToken<string>('FAKE_COLLABORATIF_API_URL');
const provideCollaboratifUi = vi.fn(
  (config: { apiUrl: string; bearerToken?: () => string | null }) => ({
    provide: FAKE_TOKEN,
    useValue: config.apiUrl,
  }),
);

describe('loadWhiteboardModule', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@pivot-platform/collaboratif-ui');
    provideCollaboratifUi.mockClear();
  });

  it('resolves to a route wrapping COLLABORATIF_ROUTES as children, when the package loads successfully', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      COLLABORATIF_ROUTES: FAKE_COLLABORATIF_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadWhiteboardModule } = await import('./whiteboard-module-loader');
    const routes = await TestBed.runInInjectionContext(() => loadWhiteboardModule());

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].children).toBe(FAKE_COLLABORATIF_ROUTES);
  });

  it("configures the package via provideCollaboratifUi() through the dynamically-imported namespace only (never a static top-level import), bridging AuthService.accessToken() as bearerToken", async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      COLLABORATIF_ROUTES: FAKE_COLLABORATIF_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadWhiteboardModule } = await import('./whiteboard-module-loader');
    const routes = await TestBed.runInInjectionContext(() => loadWhiteboardModule());

    expect(provideCollaboratifUi).toHaveBeenCalledTimes(1);
    expect(provideCollaboratifUi).toHaveBeenCalledWith({
      apiUrl: expect.any(String),
      bearerToken: expect.any(Function),
    });
    expect(routes[0].providers).toEqual([{ provide: FAKE_TOKEN, useValue: expect.any(String) }]);

    const auth = TestBed.inject(AuthService);
    const [{ bearerToken }] = provideCollaboratifUi.mock.calls[0];
    expect(bearerToken?.()).toBe(auth.accessToken());
  });

  it('resolves to the module-load-error fallback route when the dynamic import rejects', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => {
      throw new Error('network error — chunk failed to load');
    });

    const { loadWhiteboardModule } = await import('./whiteboard-module-loader');
    const routes = await TestBed.runInInjectionContext(() => loadWhiteboardModule());

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    // Statically imported (`component`, not `loadComponent`) — deliberately not itself a lazy
    // chunk, so it can't be exposed to the same class of failure it exists to recover from.
    expect(routes[0].component?.name).toContain('ModuleLoadErrorComponent');
    expect(routes[0].loadComponent).toBeUndefined();
  });
});
