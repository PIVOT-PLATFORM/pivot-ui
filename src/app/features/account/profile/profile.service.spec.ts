import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import type { ProfileDto } from './profile.model';
import { environment } from '../../../../environments/environment';

const makeDto = (overrides: Partial<ProfileDto> = {}): ProfileDto => ({
  firstName: 'Alexandre',
  lastName: 'Solane',
  email: 'alexandre.solane@example.com',
  avatarUrl: null,
  ...overrides,
});

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfile()', () => {
    it('calls GET /api/account/profile and returns the DTO', () => {
      let result: ProfileDto | undefined;
      service.getProfile().subscribe(dto => (result = dto));

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(makeDto());

      expect(result).toEqual(makeDto());
    });

    it('propagates a 403 when unauthenticated', () => {
      let status: number | undefined;
      service.getProfile().subscribe({ error: err => (status = err.status) });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(status).toBe(403);
    });
  });

  describe('updateProfile()', () => {
    it('PATCHes only firstName/lastName — never an email field', () => {
      service.updateProfile({ firstName: 'Jean', lastName: 'Dupont' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ firstName: 'Jean', lastName: 'Dupont' });
      expect(Object.keys(req.request.body)).toEqual(['firstName', 'lastName']);
      expect(req.request.body.email).toBeUndefined();

      req.flush(makeDto({ firstName: 'Jean', lastName: 'Dupont' }));
    });

    it('returns the updated DTO on success', () => {
      let result: ProfileDto | undefined;
      service.updateProfile({ firstName: 'Jean', lastName: 'Dupont' }).subscribe(dto => (result = dto));

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush(makeDto({ firstName: 'Jean', lastName: 'Dupont' }));

      expect(result?.firstName).toBe('Jean');
    });

    it('propagates a 400 INVALID_NAME error body', () => {
      let error: { error: string } | undefined;
      service.updateProfile({ firstName: '', lastName: 'Dupont' }).subscribe({
        error: err => (error = err.error),
      });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush({ error: 'INVALID_NAME', message: 'Invalid name' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.error).toBe('INVALID_NAME');
    });

    it('propagates a network error', () => {
      let errored = false;
      service.updateProfile({ firstName: 'Jean', lastName: 'Dupont' }).subscribe({
        error: () => (errored = true),
      });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });

      expect(errored).toBe(true);
    });
  });

  describe('uploadAvatar()', () => {
    it('POSTs a multipart FormData with field name "file"', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      service.uploadAvatar(file).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile/avatar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      const body = req.request.body as FormData;
      expect(body.get('file')).toBe(file);

      req.flush(makeDto({ avatarUrl: 'http://localhost:8080/api/avatars/1/abc.png' }));
    });

    it('returns the updated DTO with the new avatarUrl on success', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      let result: ProfileDto | undefined;
      service.uploadAvatar(file).subscribe(dto => (result = dto));

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush(makeDto({ avatarUrl: 'http://localhost:8080/api/avatars/1/abc.png' }));

      expect(result?.avatarUrl).toBe('http://localhost:8080/api/avatars/1/abc.png');
    });

    it('propagates a 400 AVATAR_INVALID_FORMAT error body', () => {
      const file = new File(['content'], 'avatar.gif', { type: 'image/gif' });
      let error: { error: string } | undefined;
      service.uploadAvatar(file).subscribe({ error: err => (error = err.error) });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush({ error: 'AVATAR_INVALID_FORMAT' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.error).toBe('AVATAR_INVALID_FORMAT');
    });

    it('propagates a 400 AVATAR_TOO_LARGE error body', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      let error: { error: string } | undefined;
      service.uploadAvatar(file).subscribe({ error: err => (error = err.error) });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush({ error: 'AVATAR_TOO_LARGE' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.error).toBe('AVATAR_TOO_LARGE');
    });

    it('propagates a network error', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      let errored = false;
      service.uploadAvatar(file).subscribe({ error: () => (errored = true) });

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });

      expect(errored).toBe(true);
    });
  });
});
