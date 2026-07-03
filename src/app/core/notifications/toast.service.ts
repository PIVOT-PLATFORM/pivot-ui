/**
 * ToastService — minimal in-memory queue of transient notifications.
 *
 * Rendered by ToastContainerComponent (mounted once in ShellComponent) with
 * `role="alert"` so screen readers announce each toast as it is added to the DOM
 * (role="alert" implies an assertive live region — no extra aria-live attribute needed).
 *
 * Not a full-featured toast library by design: PIVOT only needs a handful of
 * transient, accessible notifications (module-disabled redirect, future generic
 * errors) — a bespoke dependency-free service keeps the bundle small.
 */
import { Injectable, signal } from '@angular/core';
import type { ToastAction, ToastMessage } from './toast.model';

/** Default auto-dismiss delay — long enough to read a message plus one action link. */
const DEFAULT_DURATION_MS = 8000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  /** Read-only view of currently displayed toasts. */
  readonly toasts = this._toasts.asReadonly();

  /**
   * Queues a new toast notification.
   *
   * @param text            already-translated message text
   * @param action          optional call-to-action link
   * @param durationMs      auto-dismiss delay in milliseconds
   * @returns the id of the created toast (usable with `dismiss()`)
   */
  show(text: string, action?: ToastAction, durationMs = DEFAULT_DURATION_MS): number {
    const id = this.nextId++;
    this._toasts.update(list => [...list, { id, text, action }]);
    setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  /** Removes a toast before its auto-dismiss delay elapses (e.g. user clicks close). */
  dismiss(id: number): void {
    this._toasts.update(list => list.filter(toast => toast.id !== id));
  }
}
