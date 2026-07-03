import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from './toast.service';

@Component({ template: '', standalone: true })
class StubRoute {}

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideRouter([{ path: '**', component: StubRoute }])],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders no toast when the queue is empty', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('renders a toast with role="alert" when one is queued', () => {
    toastService.show('Module Tableau blanc non disponible');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toastEl = el.querySelector('.toast');
    expect(toastEl).toBeTruthy();
    expect(toastEl?.getAttribute('role')).toBe('alert');
    expect(toastEl?.textContent).toContain('Module Tableau blanc non disponible');
  });

  it('renders the action link when the toast carries one', () => {
    toastService.show('Module non disponible', { label: 'Gérer les modules', route: '/admin/modules' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.toast__action');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Gérer les modules');
  });

  it('does not render an action link when the toast has none', () => {
    toastService.show('Module non disponible');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.toast__action')).toBeNull();
  });

  it('dismisses the toast when the close button is clicked', () => {
    toastService.show('Module non disponible');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.toast__close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.toast')).toHaveLength(0);
  });
});
