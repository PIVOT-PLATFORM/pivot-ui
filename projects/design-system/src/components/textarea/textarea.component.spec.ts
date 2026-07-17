import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextareaComponent } from './textarea.component';

@Component({
  selector: 'ds-textarea-host',
  standalone: true,
  imports: [TextareaComponent, ReactiveFormsModule],
  template: `<pivot-ds-textarea [formControl]="ctrl" [rows]="rows" [invalid]="invalid" />`,
})
class HostComponent {
  ctrl = new FormControl('');
  rows = 4;
  invalid = false;
}

describe('TextareaComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const ta = (): HTMLTextAreaElement =>
    fixture.nativeElement.querySelector('textarea.form-control');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('reflects the control value (writeValue) and rows', () => {
    host.ctrl.setValue('multi\nligne');
    host.rows = 6;
    fixture.detectChanges();
    expect(ta().value).toBe('multi\nligne');
    expect(ta().getAttribute('rows')).toBe('6');
  });

  it('propagates typing back to the control', () => {
    fixture.detectChanges();
    ta().value = 'tapé';
    ta().dispatchEvent(new Event('input'));
    expect(host.ctrl.value).toBe('tapé');
  });

  it('disables when the control is disabled', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(ta().disabled).toBe(true);
  });

  it('applies the invalid state', () => {
    host.invalid = true;
    fixture.detectChanges();
    expect(ta().classList).toContain('is-invalid');
    expect(ta().getAttribute('aria-invalid')).toBe('true');
  });

  it('marks the control touched on blur', () => {
    fixture.detectChanges();
    ta().dispatchEvent(new Event('blur'));
    expect(host.ctrl.touched).toBe(true);
  });
});
