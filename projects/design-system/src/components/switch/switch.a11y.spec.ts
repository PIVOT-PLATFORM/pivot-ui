/**
 * Tests d'accessibilité automatisés (axe-core) — SwitchComponent.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SwitchComponent } from './switch.component';

@Component({
  selector: 'ds-switch-a11y-host',
  standalone: true,
  imports: [SwitchComponent, ReactiveFormsModule],
  template: `<pivot-ds-switch [formControl]="ctrl">Activer les notifications</pivot-ds-switch>`,
})
class HostComponent {
  ctrl = new FormControl(true);
}

describe('SwitchComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('has no detectable axe violations (role=switch with an accessible name)', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
