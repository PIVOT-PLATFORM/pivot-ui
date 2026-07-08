import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom, Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ModuleLoadErrorComponent } from './module-load-error.component';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLOCO_FR = {
  module_load_error: {
    title: 'Module indisponible',
    subtitle: "Une erreur est survenue lors du chargement de ce module.",
    retry: 'Réessayer',
    back: "Retour à l'accueil",
  },
};

describe('ModuleLoadErrorComponent', () => {
  let fixture: ComponentFixture<ModuleLoadErrorComponent>;
  let component: ModuleLoadErrorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleLoadErrorComponent],
      providers: [
        provideRouter([{ path: '**', component: StubComponent }]),
        importProvidersFrom(
          TranslocoTestingModule.forRoot({
            langs: { fr: TRANSLOCO_FR, en: TRANSLOCO_FR },
            translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
            preloadLangs: true,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleLoadErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders as an alert (announced to assistive tech, not a silent blank page)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('renders back link pointing to /', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.module-load-error__back') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('renders a retry button', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.module-load-error__retry')).toBeTruthy();
  });

  it('retry() reloads the page (hard reload — a stale chunk needs a fresh asset manifest)', () => {
    const reloadSpy = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: reloadSpy } as unknown as Location);

    component.retry();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('clicking the retry button calls retry()', () => {
    const retrySpy = vi.spyOn(component, 'retry').mockImplementation(() => {});
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('.module-load-error__retry') as HTMLButtonElement;

    button.click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
