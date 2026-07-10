import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { AuthShellComponent } from './auth-shell.component';
import { ensureLocalStorageStub } from '../../core/i18n/testing/local-storage-stub';

ensureLocalStorageStub();

@Component({ template: '', standalone: true })
class StubComponent {}

describe('AuthShellComponent', () => {
  let fixture: ComponentFixture<AuthShellComponent>;
  let component: AuthShellComponent;
  let transloco: TranslocoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuthShellComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [provideRouter([{ path: '**', component: StubComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthShellComponent);
    component = fixture.componentInstance;
    transloco = TestBed.inject(TranslocoService);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('setLang met à jour le signal, transloco et localStorage', () => {
    component.setLang('fr');
    expect(component.currentLang()).toBe('fr');
    expect(transloco.getActiveLang()).toBe('fr');
    expect(localStorage.getItem('pivot_lang')).toBe('fr');
  });
});
