/**
 * Tests d'accessibilité automatisés (axe-core) — TextareaComponent.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TextareaComponent } from './textarea.component';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'ds-textarea-a11y-host',
  standalone: true,
  imports: [TextareaComponent, FormFieldComponent, ReactiveFormsModule],
  template: `
    <pivot-ds-form-field label="Commentaire" #f>
      <pivot-ds-textarea
        [formControl]="ctrl"
        [id]="f.controlId"
        [ariaDescribedby]="f.describedBy || ''"
      />
    </pivot-ds-form-field>
  `,
})
class HostComponent {
  ctrl = new FormControl('');
}

describe('TextareaComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('has no detectable axe violations with an associated label', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
