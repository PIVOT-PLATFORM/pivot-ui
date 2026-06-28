import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ComingSoonComponent } from './coming-soon.component';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLOCO_FR = {
  coming_soon: {
    title: 'Page en cours de construction',
    subtitle: 'Cette section sera disponible prochainement.',
    back: 'Retour à l\'accueil',
  },
};

describe('ComingSoonComponent', () => {
  let fixture: ComponentFixture<ComingSoonComponent>;
  let component: ComingSoonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComingSoonComponent],
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

    fixture = TestBed.createComponent(ComingSoonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders back link pointing to /', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.coming-soon__back') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('renders clock icon', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.coming-soon__icon')).toBeTruthy();
  });
});
