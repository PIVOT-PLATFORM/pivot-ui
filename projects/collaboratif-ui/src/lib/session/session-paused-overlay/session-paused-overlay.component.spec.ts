import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { SessionPausedOverlayComponent } from './session-paused-overlay.component';

describe('SessionPausedOverlayComponent', () => {
  it('creates', async () => {
    await TestBed.configureTestingModule({
      imports: [SessionPausedOverlayComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    }).compileComponents();
    const fixture = TestBed.createComponent(SessionPausedOverlayComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
