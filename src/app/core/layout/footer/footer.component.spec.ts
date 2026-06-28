import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FooterComponent } from './footer.component';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLOCO_FR = {
  footer: {
    copy: 'Réalisé par l\'équipe PIVOT',
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    terms: 'CGU',
    accessibility: 'Accessibilité',
    contact: 'Contact',
    faq: 'FAQ',
    sitemap: 'Plan du site',
  },
};

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
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

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders current year in copyright', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain(new Date().getFullYear().toString());
  });

  it('has role="contentinfo" on footer element', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="contentinfo"]')).toBeTruthy();
  });

  it('renders 7 footer links', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.footer__link').length).toBe(7);
  });
});
