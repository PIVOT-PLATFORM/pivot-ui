import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectOption } from './select.component';

@Component({
  selector: 'ds-select-host',
  standalone: true,
  imports: [SelectComponent, ReactiveFormsModule],
  template: `
    <pivot-ds-select
      [formControl]="ctrl"
      [options]="options"
      [multiple]="multiple"
      [searchable]="searchable"
      placeholder="Choisir…"
      emptyLabel="Aucun résultat"
      ariaLabel="Rôle"
    />
  `,
})
class HostComponent {
  ctrl = new FormControl<string | string[] | null>('');
  options: SelectOption[] = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'member', label: 'Membre' },
    { value: 'guest', label: 'Invité', disabled: true },
  ];
  multiple = false;
  searchable = false;
}

describe('SelectComponent (design-system lib)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button.pv-select__trigger');
  const options = (): HTMLElement[] => Array.from(document.querySelectorAll('[role="option"]'));
  const openPanel = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('shows the placeholder when nothing is selected', () => {
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Choisir…');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the listbox panel on trigger click', () => {
    fixture.detectChanges();
    openPanel();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    expect(options()).toHaveLength(3);
  });

  it('single select: choosing an option emits the value and closes', () => {
    fixture.detectChanges();
    openPanel();
    options()[1].click();
    fixture.detectChanges();
    expect(host.ctrl.value).toBe('member');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().textContent).toContain('Membre');
  });

  it('multiple select: accumulates an array and stays open', () => {
    host.multiple = true;
    fixture.detectChanges();
    openPanel();
    options()[0].click();
    fixture.detectChanges();
    options()[1].click();
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['admin', 'member']);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('reflects a written value in the trigger label (writeValue)', () => {
    host.ctrl.setValue('admin');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Administrateur');
  });

  it('filters options when searching', () => {
    host.searchable = true;
    fixture.detectChanges();
    openPanel();
    const search = document.querySelector('input.pv-select__search') as HTMLInputElement;
    expect(search).not.toBeNull();
    search.value = 'mem';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const labels = options().map((o) => o.textContent?.trim());
    expect(labels).toEqual(['Membre']);
  });

  it('ArrowDown from the search field moves focus into the listbox', () => {
    host.searchable = true;
    fixture.detectChanges();
    openPanel();
    const search = document.querySelector('input.pv-select__search') as HTMLInputElement;
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    // CdkListbox prend le focus puis le porte sur l'option active (roving tabindex).
    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox?.contains(document.activeElement)).toBe(true);
  });

  it('does not open when disabled', () => {
    host.ctrl.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
    openPanel();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('closes on Escape from the trigger', () => {
    fixture.detectChanges();
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});
