/**
 * Tests d'accessibilité automatisés (axe-core) — RadioGroupComponent.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RadioGroupComponent, RadioOption } from './radio-group.component';

@Component({
  selector: 'ds-radio-a11y-host',
  standalone: true,
  imports: [RadioGroupComponent, ReactiveFormsModule],
  template: `<pivot-ds-radio-group
    [formControl]="ctrl"
    [options]="options"
    ariaLabel="Rôle du membre"
  />`,
})
class HostComponent {
  ctrl = new FormControl('admin');
  options: RadioOption[] = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'member', label: 'Membre' },
  ];
}

describe('RadioGroupComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('has no detectable axe violations (labelled radiogroup, native radios)', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
