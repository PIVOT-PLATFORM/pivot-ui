/**
 * Toast model — lightweight, screen-reader-announced notification shown after a
 * blocking event (e.g. moduleGuard redirect on a disabled module).
 */

/** Optional call-to-action rendered inside the toast (e.g. link to admin module panel). */
export interface ToastAction {
  /** Already-translated label text (guards resolve i18n before building the toast). */
  label: string;
  /** Router link target, e.g. "/admin/modules". */
  route: string;
}

/** A single toast notification instance. */
export interface ToastMessage {
  /** Monotonic id, used to dismiss this specific toast. */
  id: number;
  /** Already-translated message text. */
  text: string;
  /** Optional action link shown alongside the message. */
  action?: ToastAction;
}
