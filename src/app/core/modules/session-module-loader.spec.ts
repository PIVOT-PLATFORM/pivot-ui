import { Routes } from '@angular/router';
import { InjectionToken } from '@angular/core';

const FAKE_SESSION_ROUTES: Routes = [{ path: '', loadComponent: () => Promise.resolve(class {}) }];
const FAKE_TOKEN = new InjectionToken<string>('FAKE_COLLABORATIF_API_URL');
const provideCollaboratifUi = vi.fn((config: { apiUrl: string }) => ({ provide: FAKE_TOKEN, useValue: config.apiUrl }));

describe('loadSessionModule', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@pivot-platform/collaboratif-ui');
    provideCollaboratifUi.mockClear();
  });

  it('resolves to a route wrapping SESSION_ROUTES as children, when the package loads successfully', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      SESSION_ROUTES: FAKE_SESSION_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadSessionModule } = await import('./session-module-loader');
    const routes = await loadSessionModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].children).toBe(FAKE_SESSION_ROUTES);
  });

  it('configures the package via provideCollaboratifUi() through the dynamically-imported namespace only (never a static top-level import)', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      SESSION_ROUTES: FAKE_SESSION_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadSessionModule } = await import('./session-module-loader');
    const routes = await loadSessionModule();

    expect(provideCollaboratifUi).toHaveBeenCalledTimes(1);
    expect(provideCollaboratifUi).toHaveBeenCalledWith({ apiUrl: expect.any(String) });
    expect(routes[0].providers).toEqual([{ provide: FAKE_TOKEN, useValue: expect.any(String) }]);
  });

  it('resolves to the module-load-error fallback route when the dynamic import rejects', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => {
      throw new Error('network error — chunk failed to load');
    });

    const { loadSessionModule } = await import('./session-module-loader');
    const routes = await loadSessionModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    // Statically imported (`component`, not `loadComponent`) — deliberately not itself a lazy
    // chunk, so it can't be exposed to the same class of failure it exists to recover from.
    expect(routes[0].component?.name).toContain('ModuleLoadErrorComponent');
    expect(routes[0].loadComponent).toBeUndefined();
  });
});
