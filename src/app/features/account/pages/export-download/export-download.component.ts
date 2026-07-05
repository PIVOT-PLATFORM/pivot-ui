/**
 * ExportDownloadComponent — landing route for the emailed export download link
 * (US02.3.1, RGPD Art. 20).
 *
 * pivot-core PR #133 sends `{appUrl}/account/export/download?token={token}` in
 * the export-ready email and flags it as a placeholder pending pivot-ui
 * confirmation — this route matches it exactly, so no `EmailService` change
 * is required on the backend side.
 *
 * `GET /api/account/export/download/{token}` is an **authenticated** endpoint
 * (never a public presigned URL — IDOR-checked server-side against the
 * session's userId). A plain `<a href>` to the API cannot carry the bearer
 * `Authorization` header, so this route fetches the archive as a blob via
 * `HttpClient` (the `tokenInterceptor` attaches the header automatically) and
 * triggers the browser's native "Save File" flow itself via a synthetic,
 * off-DOM `<a download>` click on an object URL.
 *
 * Reads `token` reactively from `queryParamMap` rather than a one-off
 * snapshot: Angular's default route-reuse strategy can reuse this component
 * across two consecutive navigations to the same route path with only the
 * query param changing (e.g. two export-ready emails opened in the same tab).
 */
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExportService } from '../../service/export.service';

type DownloadState = 'downloading' | 'success' | 'error';

/** Fallback filename if the backend's `Content-Disposition` header is missing or unparseable. */
const DEFAULT_FILENAME = 'pivot-export.zip';

@Component({
  selector: 'piv-export-download',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <div class="export-dl-page">
      <main class="card export-dl-card" [attr.aria-label]="'account.rgpd.export.download.title' | transloco">
        @switch (state()) {
          @case ('downloading') {
            <div class="export-dl__status" role="status" aria-live="polite" aria-atomic="true" data-testid="download-in-progress">
              <span class="spinner" aria-hidden="true"></span>
              <p>{{ 'account.rgpd.export.download.in_progress' | transloco }}</p>
            </div>
          }
          @case ('success') {
            <div class="export-dl__status" role="status" aria-live="polite" aria-atomic="true" data-testid="download-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              <p>{{ 'account.rgpd.export.download.success' | transloco }}</p>
              <a routerLink="/account/export" class="btn btn-secondary">{{ 'account.rgpd.export.download.success_back' | transloco }}</a>
            </div>
          }
          @case ('error') {
            <div class="alert alert-error export-dl__status" role="alert" aria-live="polite" aria-atomic="true" data-testid="download-error">
              <p>{{ errorKey() | transloco }}</p>
              <a routerLink="/account/export" class="btn btn-secondary">{{ 'account.rgpd.export.download.success_back' | transloco }}</a>
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .export-dl-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 16px; min-height: 60vh; }
    .export-dl-card { max-width: 440px; width: 100%; padding: 32px; text-align: center; }
    .export-dl__status { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .export-dl__status p { margin: 0; font-size: var(--text-sm); color: var(--color-gray-700); line-height: 1.6; }
  `],
})
export class ExportDownloadComponent {
  private readonly exportService = inject(ExportService);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  readonly state = signal<DownloadState>('downloading');
  readonly errorKey = signal<string>('account.rgpd.export.download.error_generic');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const token = params.get('token');
      if (!token) {
        this.errorKey.set('account.rgpd.export.download.error_missing_token');
        this.state.set('error');
        return;
      }
      this.state.set('downloading');
      this.download(token);
    });
  }

  private download(token: string): void {
    this.exportService.download(token).subscribe({
      next: res => {
        this.triggerBlobDownload(res);
        this.state.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.errorKey.set(this.mapErrorKey(err.status));
        this.state.set('error');
      },
    });
  }

  private mapErrorKey(status: number): string {
    switch (status) {
      case 403: return 'account.rgpd.export.download.error_forbidden';
      case 404: return 'account.rgpd.export.download.error_not_found';
      case 410: return 'account.rgpd.export.download.error_expired';
      default: return 'account.rgpd.export.download.error_generic';
    }
  }

  /**
   * Saves the downloaded blob via a synthetic, off-DOM `<a download>` click on
   * an object URL — the only way to hand the browser a same-origin
   * authenticated response as a file save, since the request itself required
   * an `Authorization` header a plain anchor could never have sent.
   */
  private triggerBlobDownload(response: HttpResponse<Blob>): void {
    const body = response.body;
    if (!body) return;

    const filename = this.extractFilename(response.headers.get('Content-Disposition')) ?? DEFAULT_FILENAME;
    const objectUrl = URL.createObjectURL(body);
    const anchor = this.document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    this.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Deferred revoke: some browsers need the object URL to remain valid a
    // moment after the synchronous click() call to actually start the save.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return match ? match[1].trim() : null;
  }
}
