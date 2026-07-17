import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SwitchComponent } from './switch.component';

@Component({
  selector: 'ds-switch-host',
  standalone: true,
  imports: [SwitchComponent, ReactiveFormsModule],
  template: `<pivot-ds-switch [formControl]="ctrl">Notifications</pivot-ds-switch>`,
})
class HostComponent {
  ctrl = new FormControl(false);
}

describe('SwitchComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const sw = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[role="switch"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('exposes role=switch and reflects the control value in aria-checked (writeValue)', () => {
    host.ctrl.setValue(true);
    fixture.detectChanges();
    expect(sw().getAttribute('role')).toBe('switch');
    expect(sw().getAttribute('aria-checked')).toBe('true');
    expect(sw().classList).toContain('pv-switch--on');
  });

  it('toggles the control value on click', () => {
    fixture.detectChanges();
    sw().click();
    expect(host.ctrl.value).toBe(true);
    sw().click();
    expect(host.ctrl.value).toBe(false);
  });

  it('disables when the control is disabled', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(sw().disabled).toBe(true);
  });

  it('marks the control touched on blur', () => {
    fixture.detectChanges();
    sw().dispatchEvent(new Event('blur'));
    expect(host.ctrl.touched).toBe(true);
  });
});
