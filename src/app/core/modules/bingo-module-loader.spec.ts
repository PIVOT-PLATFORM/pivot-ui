import { Routes } from '@angular/router';
import { InjectionToken } from '@angular/core';

const FAKE_BINGO_ROUTES: Routes = [{ path: 'new', loadComponent: () => Promise.resolve(class {}) }];
const FAKE_BINGO_PUBLIC_ROUTES: Routes = [{ path: 'join', loadComponent: () => Promise.resolve(class {}) }];
const FAKE_TOKEN = new InjectionToken<string>('FAKE_COLLABORATIF_API_URL');
const provideCollaboratifUi = vi.fn((config: { apiUrl: string }) => ({ provide: FAKE_TOKEN, useValue: config.apiUrl }));

describe('loadBingoModule', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@pivot-platform/collaboratif-ui');
    provideCollaboratifUi.mockClear();
  });

  it('resolves to a route wrapping BINGO_ROUTES as children, when the package loads successfully', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      BINGO_ROUTES: FAKE_BINGO_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadBingoModule } = await import('./bingo-module-loader');
    const routes = await loadBingoModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].children).toBe(FAKE_BINGO_ROUTES);
  });

  it('configures the package via provideCollaboratifUi() through the dynamically-imported namespace only (never a static top-level import)', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      BINGO_ROUTES: FAKE_BINGO_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadBingoModule } = await import('./bingo-module-loader');
    const routes = await loadBingoModule();

    expect(provideCollaboratifUi).toHaveBeenCalledTimes(1);
    expect(provideCollaboratifUi).toHaveBeenCalledWith({ apiUrl: expect.any(String) });
    expect(routes[0].providers).toEqual([{ provide: FAKE_TOKEN, useValue: expect.any(String) }]);
  });

  it('resolves to the module-load-error fallback route when the dynamic import rejects', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => {
      throw new Error('network error — chunk failed to load');
    });

    const { loadBingoModule } = await import('./bingo-module-loader');
    const routes = await loadBingoModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].component?.name).toContain('ModuleLoadErrorComponent');
    expect(routes[0].loadComponent).toBeUndefined();
  });
});

describe('loadBingoPublicModule', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@pivot-platform/collaboratif-ui');
    provideCollaboratifUi.mockClear();
  });

  it('resolves to a route wrapping BINGO_PUBLIC_ROUTES as children, when the package loads successfully', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      BINGO_PUBLIC_ROUTES: FAKE_BINGO_PUBLIC_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadBingoPublicModule } = await import('./bingo-module-loader');
    const routes = await loadBingoPublicModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].children).toBe(FAKE_BINGO_PUBLIC_ROUTES);
  });

  it('configures the package via provideCollaboratifUi() through the dynamically-imported namespace only (never a static top-level import)', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => ({
      BINGO_PUBLIC_ROUTES: FAKE_BINGO_PUBLIC_ROUTES,
      provideCollaboratifUi,
    }));

    const { loadBingoPublicModule } = await import('./bingo-module-loader');
    const routes = await loadBingoPublicModule();

    expect(provideCollaboratifUi).toHaveBeenCalledTimes(1);
    expect(provideCollaboratifUi).toHaveBeenCalledWith({ apiUrl: expect.any(String) });
    expect(routes[0].providers).toEqual([{ provide: FAKE_TOKEN, useValue: expect.any(String) }]);
  });

  it('resolves to the module-load-error fallback route when the dynamic import rejects', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => {
      throw new Error('network error — chunk failed to load');
    });

    const { loadBingoPublicModule } = await import('./bingo-module-loader');
    const routes = await loadBingoPublicModule();

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('');
    expect(routes[0].component?.name).toContain('ModuleLoadErrorComponent');
    expect(routes[0].loadComponent).toBeUndefined();
  });
});
