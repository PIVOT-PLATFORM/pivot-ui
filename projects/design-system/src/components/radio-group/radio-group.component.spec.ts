import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RadioGroupComponent, RadioOption } from './radio-group.component';

@Component({
  selector: 'ds-radio-host',
  standalone: true,
  imports: [RadioGroupComponent, ReactiveFormsModule],
  template: `<pivot-ds-radio-group [formControl]="ctrl" [options]="options" ariaLabel="Rôle" />`,
})
class HostComponent {
  ctrl = new FormControl('');
  options: RadioOption[] = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'member', label: 'Membre' },
    { value: 'guest', label: 'Invité', disabled: true },
  ];
}

describe('RadioGroupComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const radios = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders one radio per option inside a radiogroup', () => {
    fixture.detectChanges();
    expect(radios()).toHaveLength(3);
    expect(
      fixture.nativeElement.querySelector('[role="radiogroup"]').getAttribute('aria-label'),
    ).toBe('Rôle');
  });

  it('checks the radio matching the control value (writeValue)', () => {
    host.ctrl.setValue('member');
    fixture.detectChanges();
    expect(radios()[1].checked).toBe(true);
  });

  it('propagates selection back to the control', () => {
    fixture.detectChanges();
    radios()[0].dispatchEvent(new Event('change'));
    expect(host.ctrl.value).toBe('admin');
  });

  it('disables the option flagged disabled', () => {
    fixture.detectChanges();
    expect(radios()[2].disabled).toBe(true);
  });

  it('disables every radio when the control is disabled', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(radios().every((r) => r.disabled)).toBe(true);
  });
});
