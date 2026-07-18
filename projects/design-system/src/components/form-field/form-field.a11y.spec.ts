/**
 * Tests d'accessibilité automatisés (axe-core) — FormFieldComponent.
 *
 * Rend le champ enveloppé autour d'un contrôle projeté et lance une passe axe :
 * label associé (`for`/`id`), `aria-describedby` vers l'aide puis l'erreur.
 * Fichier dédié `*.a11y.spec.ts`.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormFieldComponent } from './form-field.component';

@Component({
  selector: 'ds-form-field-a11y-host',
  standalone: true,
  imports: [FormFieldComponent],
  template: `
    <pivot-ds-form-field [label]="label" [hint]="hint" [error]="error" [required]="required" #field>
      <input
        class="form-control"
        type="email"
        [id]="field.controlId"
        [attr.aria-describedby]="field.describedBy"
        [attr.aria-invalid]="!!error"
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

describe('FormFieldComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('has no detectable axe violations with a labelled control', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations with hint + required', async () => {
    host.required = true;
    host.hint = 'Nous ne la partagerons jamais.';
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations in the error state', async () => {
    host.error = 'Adresse e-mail invalide.';
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
