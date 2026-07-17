/**
 * Tests d'accessibilité automatisés (axe-core) — InputComponent.
 * Rendu dans un `pivot-ds-form-field` (label associé) — configuration réelle d'usage.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { InputComponent } from './input.component';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'ds-input-a11y-host',
  standalone: true,
  imports: [InputComponent, FormFieldComponent, ReactiveFormsModule],
  template: `
    <pivot-ds-form-field label="Adresse e-mail" [error]="error" #f>
      <pivot-ds-input
        [formControl]="ctrl"
        type="email"
        [id]="f.controlId"
        [ariaDescribedby]="f.describedBy || ''"
        [invalid]="!!error"
      />
    </pivot-ds-form-field>
  `,
})
class HostComponent {
  ctrl = new FormControl('');
  error = '';
}

describe('InputComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('has no detectable axe violations with an associated label', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations in the error state', async () => {
    host.error = 'Adresse e-mail invalide.';
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
