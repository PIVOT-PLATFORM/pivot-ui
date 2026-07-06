import { TestBed } from '@angular/core/testing';
import { AccountDeletionStateService } from './account-deletion-state.service';
import { installMemoryLocalStorage } from './testing/memory-local-storage';

const STORAGE_KEY = 'pivot_account_deletion_pending';

describe('AccountDeletionStateService', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    TestBed.configureTestingModule({});
  });

  afterEach(() => window.localStorage.clear());

  it('reports no pending deletion by default', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    expect(service.pending()).toBeNull();
  });

  it('record() sets the signal and persists to localStorage', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    const future = new Date(Date.now() + 86_400_000).toISOString();

    service.record(future);

    expect(service.pending()).toEqual({ effectiveDeletionDate: future });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({ effectiveDeletionDate: future });
  });

  it('clear() resets the signal and removes the localStorage entry', () => {
    const service = TestBed.inject(AccountDeletionStateService);
    service.record(new Date(Date.now() + 86_400_000).toISOString());

    service.clear();

    expect(service.pending()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores a pending deletion recorded in a previous session (localStorage survives reload)', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ effectiveDeletionDate: future }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toEqual({ effectiveDeletionDate: future });
  });

  it('treats an elapsed grace period as no-pending (auto-expires) without needing a network call', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ effectiveDeletionDate: past }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });

  it('ignores malformed localStorage content instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-json{{{');

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });

  it('ignores a well-formed-JSON but wrong-shape localStorage value', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ somethingElse: true }));

    const service = TestBed.inject(AccountDeletionStateService);

    expect(service.pending()).toBeNull();
  });
});
