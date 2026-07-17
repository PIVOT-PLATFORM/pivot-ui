/**
 * Couvre l'usage des contrôles de formulaire **sans** `FormControl` (template-driven / lecture
 * seule) : les callbacks `ControlValueAccessor` par défaut (`onChange`/`onTouched` = no-op, non
 * remplacés faute de `registerOn*`) sont alors réellement invoqués sur interaction.
 */
import { TestBed } from '@angular/core/testing';
import { InputComponent } from './input/input.component';
import { TextareaComponent } from './textarea/textarea.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { RadioGroupComponent } from './radio-group/radio-group.component';
import { SwitchComponent } from './switch/switch.component';

describe('Form controls — default no-op CVA callbacks (no FormControl bound)', () => {
  it('InputComponent handles input + blur without a control', () => {
    const f = TestBed.createComponent(InputComponent);
    f.detectChanges();
    const el = f.nativeElement.querySelector('input') as HTMLInputElement;
    el.value = 'x';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    expect(f.componentInstance).toBeTruthy();
  });

  it('TextareaComponent handles input + blur without a control', () => {
    const f = TestBed.createComponent(TextareaComponent);
    f.detectChanges();
    const el = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    el.value = 'x';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    expect(f.componentInstance).toBeTruthy();
  });

  it('CheckboxComponent handles change + blur without a control', () => {
    const f = TestBed.createComponent(CheckboxComponent);
    f.detectChanges();
    const el = f.nativeElement.querySelector('input') as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event('change'));
    el.dispatchEvent(new Event('blur'));
    expect(f.componentInstance).toBeTruthy();
  });

  it('RadioGroupComponent handles change + blur without a control', () => {
    const f = TestBed.createComponent(RadioGroupComponent);
    f.componentInstance.options = [{ value: 'a', label: 'A' }];
    f.detectChanges();
    const el = f.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement;
    el.dispatchEvent(new Event('change'));
    el.dispatchEvent(new Event('blur'));
    expect(f.componentInstance).toBeTruthy();
  });

  it('SwitchComponent handles click + blur without a control', () => {
    const f = TestBed.createComponent(SwitchComponent);
    f.detectChanges();
    const el = f.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement;
    el.click();
    el.dispatchEvent(new Event('blur'));
    expect(f.componentInstance).toBeTruthy();
  });
});
