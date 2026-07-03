import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ToastService, TOAST_AUTO_DISMISS_MS } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no toast', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('show() adds a toast with the given key and type', () => {
    service.show('auth.session.expired', 'warning');

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].messageKey).toBe('auth.session.expired');
    expect(service.toasts()[0].type).toBe('warning');
  });

  it('show() defaults to the info type', () => {
    service.show('common.loading');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('show() deduplicates toasts with the same message key (parallel 401 burst)', () => {
    const first = service.show('auth.session.expired', 'warning');
    const second = service.show('auth.session.expired', 'warning');

    expect(service.toasts()).toHaveLength(1);
    expect(second).toBe(first);
  });

  it('show() stacks toasts with distinct message keys', () => {
    service.show('auth.session.expired', 'warning');
    service.show('common.error_generic', 'error');

    expect(service.toasts()).toHaveLength(2);
  });

  it('dismiss() removes the targeted toast only', () => {
    const id = service.show('auth.session.expired', 'warning');
    service.show('common.error_generic', 'error');

    service.dismiss(id);

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].messageKey).toBe('common.error_generic');
  });

  it('auto-dismisses a toast after TOAST_AUTO_DISMISS_MS', () => {
    service.show('auth.session.expired', 'warning');
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS);

    expect(service.toasts()).toEqual([]);
  });

  it('dismiss() with an unknown id is a no-op', () => {
    service.show('auth.session.expired', 'warning');
    service.dismiss(9999);
    expect(service.toasts()).toHaveLength(1);
  });

  it('show() attaches an optional action link', () => {
    service.show('modules.guard.disabled', 'warning', { module: 'whiteboard' }, {
      labelKey: 'modules.guard.adminLink',
      route: '/admin/modules',
    });

    expect(service.toasts()[0].action).toEqual({
      labelKey: 'modules.guard.adminLink',
      route: '/admin/modules',
    });
  });

  it('show() without an action leaves it undefined', () => {
    service.show('auth.session.expired', 'warning');
    expect(service.toasts()[0].action).toBeUndefined();
  });
});
