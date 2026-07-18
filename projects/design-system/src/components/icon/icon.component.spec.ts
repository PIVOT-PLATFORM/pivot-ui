import { TestBed, ComponentFixture } from '@angular/core/testing';
import { IconComponent } from './icon.component';
import { IconRegistry } from './icon-registry';

describe('IconComponent (design-system lib)', () => {
  let fixture: ComponentFixture<IconComponent>;
  let component: IconComponent;

  const span = (): HTMLElement =>
    fixture.nativeElement.querySelector('span.pv-icon') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  it('renders inline SVG for a known icon', () => {
    component.name = 'circle-check';
    fixture.detectChanges();
    expect(span().innerHTML).toContain('<svg');
    expect(span().innerHTML).toContain('viewBox="0 0 24 24"');
  });

  it('honours the size input', () => {
    component.name = 'check';
    component.size = 32;
    fixture.detectChanges();
    expect(span().innerHTML).toContain('width="32"');
    expect(span().innerHTML).toContain('height="32"');
  });

  it('renders empty for an unknown icon (no throw)', () => {
    component.name = 'does-not-exist';
    fixture.detectChanges();
    expect(span().innerHTML.trim()).toBe('');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    component.name = 'info';
    fixture.detectChanges();
    expect(span().getAttribute('aria-hidden')).toBe('true');
    expect(span().getAttribute('role')).toBeNull();
    expect(span().getAttribute('aria-label')).toBeNull();
  });

  it('becomes meaningful when a label is provided', () => {
    component.name = 'info';
    component.label = 'Information';
    fixture.detectChanges();
    expect(span().getAttribute('role')).toBe('img');
    expect(span().getAttribute('aria-label')).toBe('Information');
    expect(span().getAttribute('aria-hidden')).toBeNull();
  });

  it('applies the spin modifier class', () => {
    component.name = 'loader';
    component.spin = true;
    fixture.detectChanges();
    expect(span().classList).toContain('pv-icon--spin');
  });

  it('renders icons registered at runtime', () => {
    const registry = TestBed.inject(IconRegistry);
    registry.register('star', '<path d="M12 2l3 7h7l-6 4 3 7-7-5-7 5 3-7-6-4h7z"/>');
    component.name = 'star';
    fixture.detectChanges();
    expect(span().innerHTML).toContain('<svg');
  });
});

describe('IconRegistry', () => {
  it('ships the default semantic set', () => {
    const registry = new IconRegistry();
    for (const name of [
      'check',
      'x',
      'chevron-down',
      'circle-check',
      'circle-alert',
      'triangle-alert',
      'info',
      'loader',
      'search',
      'plus',
    ]) {
      expect(registry.has(name)).toBe(true);
    }
  });

  it('register overrides an existing entry', () => {
    const registry = new IconRegistry();
    registry.register('check', '<path d="M0 0"/>');
    expect(registry.get('check')).toBe('<path d="M0 0"/>');
  });

  it('registerMany adds several entries', () => {
    const registry = new IconRegistry();
    registry.registerMany({ a: '<path/>', b: '<circle/>' });
    expect(registry.has('a')).toBe(true);
    expect(registry.has('b')).toBe(true);
  });
});
