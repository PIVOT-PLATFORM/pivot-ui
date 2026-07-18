import type { Meta, StoryObj } from '@storybook/angular';
import { Component } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';
import { IconRegistry } from '../components/icon/icon-registry';

@Component({
  selector: 'pivot-ds-icon-gallery',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;font-family:var(--font-sans);"
    >
      @for (name of names; track name) {
        <div
          style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;border:1px solid var(--color-gray-200);border-radius:var(--radius-md);color:var(--color-brand-600);"
        >
          <pivot-ds-icon [name]="name" [size]="28" />
          <code style="font-size:var(--text-xs);color:var(--color-gray-700);">{{ name }}</code>
        </div>
      }
    </div>
  `,
})
class IconGalleryComponent {
  readonly names = new IconRegistry().names();
}

const meta: Meta<IconGalleryComponent> = {
  title: 'Fondations/Icon',
  component: IconGalleryComponent,
};
export default meta;

type Story = StoryObj<IconGalleryComponent>;

/** Jeu d'icônes par défaut (Lucide/ISC). La couleur suit `currentColor`. */
export const DefaultSet: Story = {};

/** Icône en rotation (loader) + icône signifiante avec `label`. */
export const SpinnerAndLabelled: StoryObj<IconComponent> = {
  render: () => ({
    template: `
      <div style="display:flex;gap:24px;align-items:center;color:var(--color-brand-600);">
        <pivot-ds-icon name="loader" [spin]="true" [size]="28" label="Chargement en cours" />
        <pivot-ds-icon name="circle-check" [size]="28" label="Terminé" />
      </div>
    `,
    moduleMetadata: { imports: [IconComponent] },
  }),
};
