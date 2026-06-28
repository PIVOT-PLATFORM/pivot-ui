import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { HomeComponent } from './home.component';

const TRANSLOCO_FR = {
  home: { title: 'Accueil', subtitle: 'Page en cours de construction.' },
};

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        importProvidersFrom(
          TranslocoTestingModule.forRoot({
            langs: { fr: TRANSLOCO_FR, en: TRANSLOCO_FR },
            translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
            preloadLangs: true,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders placeholder container', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.home-placeholder')).toBeTruthy();
  });

  it('renders h1 title via i18n', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Accueil');
  });
});
