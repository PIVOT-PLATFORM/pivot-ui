import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
  });

  it('renders a footer element', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('footer')).toBeTruthy();
  });

  it('displays the current year and PIVOT', () => {
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain(String(new Date().getFullYear()));
    expect(text).toContain('PIVOT');
  });
});
