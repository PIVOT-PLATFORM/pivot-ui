import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates the service with an empty queue', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('adds a toast to the queue on show()', () => {
    service.show('Module non disponible');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].text).toBe('Module non disponible');
  });

  it('attaches an optional action to the toast', () => {
    service.show('Module non disponible', { label: 'Gérer les modules', route: '/admin/modules' });

    expect(service.toasts()[0].action).toEqual({ label: 'Gérer les modules', route: '/admin/modules' });
  });

  it('assigns increasing unique ids to successive toasts', () => {
    const id1 = service.show('first');
    const id2 = service.show('second');

    expect(id1).not.toBe(id2);
    expect(service.toasts().map(t => t.id)).toEqual([id1, id2]);
  });

  it('dismiss() removes only the targeted toast', () => {
    const id1 = service.show('first');
    const id2 = service.show('second');

    service.dismiss(id1);

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].id).toBe(id2);
  });

  it('auto-dismisses a toast after its duration elapses', () => {
    vi.useFakeTimers();
    service.show('will disappear', undefined, 1000);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(service.toasts()).toHaveLength(0);
  });

  it('does not throw when dismissing an id that no longer exists', () => {
    expect(() => service.dismiss(9999)).not.toThrow();
  });
});
