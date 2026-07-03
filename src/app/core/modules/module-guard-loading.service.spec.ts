import { TestBed } from '@angular/core/testing';
import { ModuleGuardLoadingService } from './module-guard-loading.service';

describe('ModuleGuardLoadingService', () => {
  let service: ModuleGuardLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModuleGuardLoadingService);
  });

  it('starts with checking() false', () => {
    expect(service.checking()).toBe(false);
  });

  it('start() sets checking() to true', () => {
    service.start();
    expect(service.checking()).toBe(true);
  });

  it('end() sets checking() back to false', () => {
    service.start();
    service.end();
    expect(service.checking()).toBe(false);
  });

  it('stays true while any of several overlapping checks is still pending', () => {
    service.start();
    service.start();
    service.end();

    expect(service.checking()).toBe(true);

    service.end();
    expect(service.checking()).toBe(false);
  });

  it('never goes negative when end() is called more often than start()', () => {
    service.end();
    service.end();
    expect(service.checking()).toBe(false);

    service.start();
    expect(service.checking()).toBe(true);
  });
});
