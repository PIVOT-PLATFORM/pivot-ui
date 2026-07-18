import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'ds-button-host',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <pivot-ds-button
      [variant]="variant"
      [type]="type"
      [disabled]="disabled"
      [loading]="loading"
      [full]="full"
      [size]="size"
      [icon]="icon"
    >
      Enregistrer
    </pivot-ds-button>
  `,
})
class HostComponent {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  type: 'button' | 'submit' | 'reset' = 'button';
  disabled = false;
  loading = false;
  full = false;
  size: 'md' | 'lg' = 'md';
  icon = '';
}

describe('ButtonComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const btn = (): HTMLButtonElement => fixture.nativeElement.querySelector('button.btn');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders a button with the variant class and projected label', () => {
    fixture.detectChanges();
    expect(btn().classList).toContain('btn-primary');
    expect(btn().textContent).toContain('Enregistrer');
  });

  it('maps each variant to its BEM class', () => {
    for (const [variant, cls] of [
      ['secondary', 'btn-secondary'],
      ['ghost', 'btn-ghost'],
      ['danger', 'btn-danger'],
    ] as const) {
      const f = TestBed.createComponent(HostComponent);
      f.componentInstance.variant = variant;
      f.detectChanges();
      expect((f.nativeElement.querySelector('button.btn') as HTMLElement).classList).toContain(cls);
    }
  });

  it('forwards the native type and full/lg modifiers', () => {
    host.type = 'submit';
    host.full = true;
    host.size = 'lg';
    fixture.detectChanges();
    expect(btn().getAttribute('type')).toBe('submit');
    expect(btn().classList).toContain('btn-full');
    expect(btn().classList).toContain('btn-lg');
  });

  it('disables the button when disabled', () => {
    host.disabled = true;
    fixture.detectChanges();
    expect(btn().disabled).toBe(true);
  });

  it('loading disables, sets aria-busy and renders the spinner icon', () => {
    host.loading = true;
    fixture.detectChanges();
    expect(btn().disabled).toBe(true);
    expect(btn().getAttribute('aria-busy')).toBe('true');
    expect(btn().querySelector('.pv-icon--spin')).not.toBeNull();
  });

  it('renders a leading icon when provided and not loading', () => {
    host.icon = 'plus';
    fixture.detectChanges();
    expect(btn().querySelector('span.pv-icon')).not.toBeNull();
  });
});
