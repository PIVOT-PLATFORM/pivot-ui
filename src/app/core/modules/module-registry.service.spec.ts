import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ModuleRegistryService } from './module-registry.service';
import { MODULE_METADATA } from './module-metadata';
import type { PivotModuleDto } from './module.model';
import { environment } from '../../../environments/environment';

const makeDto = (id: string, enabled = true): PivotModuleDto => ({
  id,
  name: id,
  version: '1.0.0',
  enabled,
  status: 'online',
});

describe('ModuleRegistryService', () => {
  let service: ModuleRegistryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModuleRegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('comingSoonModules', () => {
    it('returns all MODULE_METADATA entries when API returns empty array', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([]);

      const comingSoon = service.comingSoonModules();
      const metaKeys = Object.keys(MODULE_METADATA);

      expect(comingSoon).toHaveLength(metaKeys.length);
      metaKeys.forEach(id => {
        expect(comingSoon.some(m => m.id === id)).toBe(true);
      });
    });

    it('excludes modules already returned by the API', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('whiteboard')]);

      const comingSoon = service.comingSoonModules();
      expect(comingSoon.some(m => m.id === 'whiteboard')).toBe(false);
    });

    it('marks all comingSoon entries with comingSoon: true', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([]);

      service.comingSoonModules().forEach(m => {
        expect(m.comingSoon).toBe(true);
        expect(m.enabled).toBe(false);
        expect(m.status).toBe('offline');
      });
    });
  });

  describe('activeModules', () => {
    it('returns empty array when no modules loaded', () => {
      expect(service.activeModules()).toEqual([]);
    });

    it('filters out disabled modules', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([
        makeDto('whiteboard', false),
        makeDto('session', true),
      ]);

      const active = service.activeModules();
      // session is enabled but comingSoon: true in metadata → filtered out
      // only truly enabled AND !comingSoon modules pass
      active.forEach(m => {
        expect(m.enabled).toBe(true);
        expect(m.comingSoon).toBe(false);
      });
    });

    it('excludes comingSoon modules even when enabled', () => {
      // All current metadata entries have comingSoon: true
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('session', true)]);

      // session metadata has comingSoon: true → should not appear in activeModules
      const active = service.activeModules();
      expect(active.some(m => m.id === 'session')).toBe(false);
    });

    it('enriches known module id with icon, color and route from MODULE_METADATA', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('whiteboard', true)]);

      const enriched = service.enrichedModules();
      const wb = enriched.find(m => m.id === 'whiteboard');
      expect(wb).toBeDefined();
      expect(wb!.icon).toContain('<svg');
      expect(wb!.color).toBe('#8B5CF6');
      expect(wb!.route).toBe('/whiteboard');
    });
  });

  describe('loadModules()', () => {
    it('calls GET /api/modules', () => {
      service.loadModules().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/modules`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('updates the modules signal after response', () => {
      expect(service.modules()).toHaveLength(0);

      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([
        makeDto('whiteboard'),
        makeDto('session'),
      ]);

      expect(service.modules()).toHaveLength(2);
      expect(service.modules()[0].id).toBe('whiteboard');
    });

    it('enriches DTOs with icon and route from MODULE_METADATA', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('roadmap')]);

      const enriched = service.enrichedModules();
      expect(enriched[0].icon).toContain('<svg');
      expect(enriched[0].route).toBe('/roadmap');
      expect(enriched[0].description).toBe('Roadmap et Gantt intégré');
    });

    it('uses defaultMeta for unknown module ids', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('unknown-module')]);

      const enriched = service.enrichedModules();
      expect(enriched[0].route).toBe('/unknown-module');
      expect(enriched[0].color).toBe('#756693');
    });

    it('resets signal to [] and completes without error on HTTP 500', () => {
      let completed = false;
      let errored = false;

      service.loadModules().subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });

      httpMock
        .expectOne(`${environment.apiUrl}/modules`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBe(false);
      expect(completed).toBe(true);
      expect(service.modules()).toHaveLength(0);
    });

    it('resets signal to [] and completes without error on network failure', () => {
      let completed = false;
      let errored = false;

      service.loadModules().subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });

      httpMock
        .expectOne(`${environment.apiUrl}/modules`)
        .error(new ProgressEvent('network-error'));

      expect(errored).toBe(false);
      expect(completed).toBe(true);
      expect(service.modules()).toHaveLength(0);
    });

    it('updates computed signals reactively on second loadModules() call', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/modules`).flush([makeDto('whiteboard')]);
      expect(service.modules()).toHaveLength(1);

      service.loadModules().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/modules`)
        .flush([makeDto('whiteboard'), makeDto('session')]);

      expect(service.modules()).toHaveLength(2);
      expect(service.enrichedModules()).toHaveLength(2);
    });
  });
});
