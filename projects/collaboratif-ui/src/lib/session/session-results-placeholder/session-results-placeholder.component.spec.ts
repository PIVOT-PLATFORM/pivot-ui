import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { SessionResultsPlaceholderComponent } from './session-results-placeholder.component';

describe('SessionResultsPlaceholderComponent', () => {
  it('creates', async () => {
    await TestBed.configureTestingModule({
      imports: [SessionResultsPlaceholderComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SessionResultsPlaceholderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
