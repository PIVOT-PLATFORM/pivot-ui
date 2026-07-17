import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormFieldComponent } from './form-field.component';

@Component({
  selector: 'ds-form-field-host',
  standalone: true,
  imports: [FormFieldComponent],
  template: `
    <pivot-ds-form-field [label]="label" [hint]="hint" [error]="error" [required]="required" #field>
      <input
        class="form-control"
        [id]="field.controlId"
        [attr.aria-describedby]="field.describedBy"
      />
    </pivot-ds-form-field>
  `,
})
class HostComponent {
  label = 'Adresse e-mail';
  hint = '';
  error = '';
  required = false;
}

describe('FormFieldComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders a label linked to the projected control', () => {
    fixture.detectChanges();
    const label = el('label.form-label') as HTMLLabelElement;
    const input = el('input.form-control') as HTMLInputElement;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(label.textContent).toContain('Adresse e-mail');
  });

  it('omits the label when none is provided', () => {
    host.label = '';
    fixture.detectChanges();
    expect(el('label.form-label')).toBeNull();
  });

  it('renders a hint and wires aria-describedby to it', () => {
    host.hint = 'Nous ne la partagerons jamais.';
    fixture.detectChanges();
    const hint = el('p.form-hint') as HTMLElement;
    const input = el('input.form-control') as HTMLInputElement;
    expect(hint.textContent).toContain('Nous ne la partagerons jamais.');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('renders an error with role=alert and prefers it over the hint', () => {
    host.hint = 'aide';
    host.error = 'E-mail invalide';
    fixture.detectChanges();
    expect(el('p.form-hint')).toBeNull();
    const error = el('p.form-error') as HTMLElement;
    const input = el('input.form-control') as HTMLInputElement;
    expect(error.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('marks required fields visually while hiding the marker from assistive tech', () => {
    host.required = true;
    fixture.detectChanges();
    const marker = el('label.form-label span[aria-hidden="true"]');
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toContain('*');
  });

  it('describedBy is null when neither hint nor error is set', () => {
    fixture.detectChanges();
    const input = el('input.form-control') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});
