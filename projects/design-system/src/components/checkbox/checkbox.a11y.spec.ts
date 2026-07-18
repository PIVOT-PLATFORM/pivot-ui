/**
 * Tests d'accessibilité automatisés (axe-core) — CheckboxComponent.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { CheckboxComponent } from './checkbox.component';

@Component({
  selector: 'ds-checkbox-a11y-host',
  standalone: true,
  imports: [CheckboxComponent, ReactiveFormsModule],
  template: `<pivot-ds-checkbox [formControl]="ctrl">J'accepte les conditions</pivot-ds-checkbox>`,
})
class HostComponent {
  ctrl = new FormControl(false);
}

describe('CheckboxComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('has no detectable axe violations (label wraps the native checkbox)', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
