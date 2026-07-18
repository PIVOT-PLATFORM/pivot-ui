import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from './input.component';

@Component({
  selector: 'ds-input-host',
  standalone: true,
  imports: [InputComponent, ReactiveFormsModule],
  template: `<pivot-ds-input [formControl]="ctrl" [type]="type" [invalid]="invalid" />`,
})
class HostComponent {
  ctrl = new FormControl('');
  type = 'text';
  invalid = false;
}

describe('InputComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input.form-control');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('reflects the control value into the input (writeValue)', () => {
    host.ctrl.setValue('bonjour');
    fixture.detectChanges();
    expect(input().value).toBe('bonjour');
  });

  it('propagates typing back to the control (onChange)', () => {
    fixture.detectChanges();
    input().value = 'tapé';
    input().dispatchEvent(new Event('input'));
    expect(host.ctrl.value).toBe('tapé');
  });

  it('forwards the type input', () => {
    host.type = 'email';
    fixture.detectChanges();
    expect(input().getAttribute('type')).toBe('email');
  });

  it('disables the input when the control is disabled (setDisabledState)', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
  });

  it('applies the invalid state class and aria-invalid', () => {
    host.invalid = true;
    fixture.detectChanges();
    expect(input().classList).toContain('is-invalid');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('marks the control touched on blur', () => {
    fixture.detectChanges();
    expect(host.ctrl.touched).toBe(false);
    input().dispatchEvent(new Event('blur'));
    expect(host.ctrl.touched).toBe(true);
  });
});
