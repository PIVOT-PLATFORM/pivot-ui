import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { SessionActivityPlaceholderComponent } from './session-activity-placeholder.component';

describe('SessionActivityPlaceholderComponent', () => {
  it('renders the given activity type', async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityPlaceholderComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    }).compileComponents();
    const fixture = TestBed.createComponent(SessionActivityPlaceholderComponent);
    fixture.componentRef.setInput('type', 'QUIZ');
    fixture.detectChanges();
    expect(fixture.componentInstance.type()).toBe('QUIZ');
  });
});
