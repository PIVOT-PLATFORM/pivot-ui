import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TrustedDevicesService } from './trusted-device.service';
import type { TrustedDeviceDto } from './trusted-device.model';
import { environment } from '../../../../../environments/environment';

const makeDto = (id: number, overrides: Partial<TrustedDeviceDto> = {}): TrustedDeviceDto => ({
  id,
  device: `Device ${id}`,
  ip: '203.0.113.5',
  createdAt: '2026-07-01T10:00:00Z',
  lastSeenAt: '2026-07-05T09:30:00Z',
  isCurrent: false,
  ...overrides,
});

describe('TrustedDevicesService', () => {
  let service: TrustedDevicesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrustedDevicesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('loadDevices()', () => {
    it('calls GET /api/auth/devices and populates the devices signal on success', () => {
      service.loadDevices().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/devices`);
      expect(req.request.method).toBe('GET');
      req.flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      expect(service.devices()).toHaveLength(2);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBe(false);
    });

    it('sets loading true while the request is in flight', () => {
      service.loadDevices().subscribe();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([]);
      expect(service.loading()).toBe(false);
    });

    it('sets loadError true and empties devices on a GET failure', () => {
      service.loadDevices().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/devices`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.loadError()).toBe(true);
      expect(service.loading()).toBe(false);
      expect(service.devices()).toEqual([]);
    });

    it('403 (no bearer token) is treated as a load error, same as every other authenticated endpoint', () => {
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(service.loadError()).toBe(true);
      expect(service.devices()).toEqual([]);
    });
  });

  describe('revoke()', () => {
    it('removes the device from the list optimistically and calls DELETE /{id}', () => {
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.devices().find(d => d.id === 2)!;
      service.revoke(target).subscribe();

      expect(service.devices().some(d => d.id === 2)).toBe(false);
      expect(service.isRevoking(2)).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/devices/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.isRevoking(2)).toBe(false);
    });

    it('restores the device and rethrows on failure (404 not owned / already revoked)', () => {
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.devices().find(d => d.id === 2)!;
      let error: unknown;
      service.revoke(target).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/auth/devices/2`)
        .flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
      expect(service.isRevoking(2)).toBe(false);
      expect(service.devices().some(d => d.id === 2)).toBe(true);
    });

    it('restores the device and rethrows on failure (403 — attempted revoke of the current device)', () => {
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const current = service.devices().find(d => d.id === 1)!;
      let error: unknown;
      service.revoke(current).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/auth/devices/1`)
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(error).toBeTruthy();
      expect(service.devices().some(d => d.id === 1)).toBe(true);
    });

    it('does not duplicate the device on restore if it was already re-added', () => {
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.devices().find(d => d.id === 2)!;
      service.revoke(target).subscribe({ error: () => undefined });
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/devices/2`);
      // Simulate the device having already reappeared (e.g. a concurrent reload) before the error resolves.
      service.loadDevices().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(service.devices().filter(d => d.id === 2)).toHaveLength(1);
    });
  });
});
