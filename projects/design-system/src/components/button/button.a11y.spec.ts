/**
 * Tests d'accessibilité automatisés (axe-core) — ButtonComponent.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'ds-button-a11y-host',
  standalone: true,
  imports: [ButtonComponent],
  template: `<pivot-ds-button [variant]="variant" [loading]="loading"
    >Enregistrer</pivot-ds-button
  >`,
})
class HostComponent {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  loading = false;
}

describe('ButtonComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('has no detectable axe violations', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations while loading', async () => {
    host.loading = true;
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });
});
