import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CheckboxComponent } from './checkbox.component';

@Component({
  selector: 'ds-checkbox-host',
  standalone: true,
  imports: [CheckboxComponent, ReactiveFormsModule],
  template: `<pivot-ds-checkbox [formControl]="ctrl" [indeterminate]="indeterminate"
    >J'accepte</pivot-ds-checkbox
  >`,
})
class HostComponent {
  ctrl = new FormControl(false);
  indeterminate = false;
}

describe('CheckboxComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const box = (): HTMLInputElement => fixture.nativeElement.querySelector('input[type="checkbox"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('reflects the control value (writeValue) and projects the label', () => {
    host.ctrl.setValue(true);
    fixture.detectChanges();
    expect(box().checked).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("J'accepte");
  });

  it('propagates toggling back to the control as a boolean', () => {
    fixture.detectChanges();
    box().checked = true;
    box().dispatchEvent(new Event('change'));
    expect(host.ctrl.value).toBe(true);
  });

  it('renders the indeterminate visual state', () => {
    host.indeterminate = true;
    fixture.detectChanges();
    expect(box().indeterminate).toBe(true);
  });

  it('disables when the control is disabled', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(box().disabled).toBe(true);
  });

  it('marks the control touched on blur', () => {
    fixture.detectChanges();
    box().dispatchEvent(new Event('blur'));
    expect(host.ctrl.touched).toBe(true);
  });
});
