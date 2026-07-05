import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';
import { installMemoryLocalStorage } from './features/account/deletion/testing/memory-local-storage';

describe('App', () => {
  beforeEach(async () => {
    // US02.2.4 — AccountDeletionStateService reads localStorage at construction;
    // install a working in-memory Storage so a leaked/absent value from another
    // spec file can't affect this suite (see memory-local-storage.ts doc).
    installMemoryLocalStorage();
    await TestBed.configureTestingModule({
      imports: [
        App,
        // Le conteneur global de toasts (US01.1.5) utilise le pipe transloco
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('mounts the global toast container (US01.1.5)', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('piv-toast-container')).not.toBeNull();
  });

  it('embarque l indicateur global de navigation (US01.1.4)', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('piv-route-loading')).not.toBeNull();
  });

  it('mounts the account deletion banner (US02.2.4) — visible regardless of auth state', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('piv-account-deletion-banner')).not.toBeNull();
  });
});
