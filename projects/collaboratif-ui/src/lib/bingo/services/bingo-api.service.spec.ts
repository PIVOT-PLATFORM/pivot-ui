import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { BingoRoomResponse } from '../models/bingo.model';
import { BingoApiService } from './bingo-api.service';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BASE = `${TEST_API_URL}/bingo/rooms`;

const ROOM: BingoRoomResponse = {
  roomId: 'r-1',
  code: 'ABCDEF',
  name: 'Reunion hebdo',
  status: 'OPEN',
  maxPlayers: 50,
  expiresAt: '2026-07-28T08:00:00Z',
  wsTopic: '/topic/collaboratif/bingo/r-1',
  accessToken: 'token-1',
  role: 'PLAYER',
  grid: { cells: [] },
};

describe('BingoApiService', () => {
  let service: BingoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(BingoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createRoom() POSTs to /bingo/rooms with the given name', () => {
    service.createRoom({ name: 'Reunion hebdo' }).subscribe();
    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Reunion hebdo' });
    req.flush(ROOM);
  });

  it('joinRoom() POSTs to /bingo/rooms/join with code and displayName', () => {
    service.joinRoom({ code: 'ABCDEF', displayName: 'Guest Alice' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/join`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: 'Guest Alice' });
    req.flush({ ...ROOM, code: null });
  });

  it('joinRoom() omits displayName for an authenticated join', () => {
    service.joinRoom({ code: 'ABCDEF' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/join`);
    expect(req.request.body).toEqual({ code: 'ABCDEF' });
    req.flush({ ...ROOM, code: null });
  });

  it('getGrid() GETs /bingo/rooms/{roomId}/grid presenting the access-token header, never a query param', () => {
    service.getGrid('r-1', 'token-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/r-1/grid`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('access-token')).toBe('token-1');
    expect(req.request.url).not.toContain('token-1');
    req.flush({ roomId: 'r-1', status: 'OPEN', role: 'PLAYER', grid: { cells: [] } });
  });
});
