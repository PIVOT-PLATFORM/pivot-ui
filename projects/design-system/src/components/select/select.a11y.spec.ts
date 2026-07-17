/**
 * Tests d'accessibilité automatisés (axe-core) — SelectComponent.
 * Le panneau (listbox) est rendu dans l'overlay CDK (document.body) — testé séparément.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SelectComponent, SelectOption } from './select.component';

@Component({
  selector: 'ds-select-a11y-host',
  standalone: true,
  imports: [SelectComponent, ReactiveFormsModule],
  template: `
    <pivot-ds-select
      [formControl]="ctrl"
      [options]="options"
      [searchable]="searchable"
      ariaLabel="Rôle du membre"
      placeholder="Choisir un rôle"
      searchPlaceholder="Rechercher"
    />
  `,
})
class SelectA11yHost {
  ctrl = new FormControl('');
  searchable = false;
  options: SelectOption[] = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'member', label: 'Membre' },
  ];
}

describe('SelectComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<SelectA11yHost>;
  let host: SelectA11yHost;

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button.pv-select__trigger');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelectA11yHost] }).compileComponents();
    fixture = TestBed.createComponent(SelectA11yHost);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('has no detectable axe violations when closed (combobox trigger)', async () => {
    fixture.detectChanges();
    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
  });

  it('has no detectable axe violations when open (listbox panel)', async () => {
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const panel = document.querySelector('.pv-select__panel') as HTMLElement;
    expect(panel).not.toBeNull();
    expect(await axe(panel)).toHaveNoViolations();
  });

  it('has no detectable axe violations with the search field open', async () => {
    host.searchable = true;
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const panel = document.querySelector('.pv-select__panel') as HTMLElement;
    expect(await axe(panel)).toHaveNoViolations();
  });
});
