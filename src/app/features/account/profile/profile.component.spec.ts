import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { ProfileComponent } from './profile.component';
import { ToastService } from '../../../shared/toast/toast.service';
import type { ProfileDto } from './profile.model';
import { environment } from '../../../../environments/environment';
import { ensureLocalStorageStub } from '../../../core/i18n/testing/local-storage-stub';

ensureLocalStorageStub();

@Component({ template: '', standalone: true })
class StubComponent {}

const frTranslations = {
  common: { back: 'Retour', field_required: 'Ce champ est obligatoire.', loading: 'Chargement en cours…' },
  account: {
    preferences: {
      title: 'Langue',
      language_label: 'Langue préférée',
      language_fr: 'Français',
      language_en: 'English',
      hint: "Cette langue sera utilisée pour l'interface et les emails transactionnels.",
      success: 'Langue mise à jour.',
      error_save_generic: 'Impossible de mettre à jour la langue. Réessayez.',
    },
    profile: {
      title: 'Mon profil',
      subtitle: 'Consultez et modifiez vos informations personnelles.',
      main_aria: 'Profil du compte',
      loading: 'Chargement du profil…',
      error_load: 'Impossible de charger votre profil. Réessayez.',
      retry: 'Réessayer',
      avatar_section_title: 'Photo de profil',
      avatar_change: 'Changer la photo',
      avatar_hint: 'JPEG, PNG ou WEBP, 2 Mo maximum.',
      avatar_error_invalid_format: "Format non supporté. Utilisez une image JPEG, PNG ou WEBP.",
      avatar_error_too_large: 'Image trop volumineuse. Taille maximale : 2 Mo.',
      avatar_error_generic: "Impossible d'envoyer l'image. Réessayez.",
      form_title: 'Informations personnelles',
      form_aria: 'Formulaire de modification du profil',
      first_name: 'Prénom',
      last_name: 'Nom',
      email: 'Email',
      email_hint: "L'adresse email ne peut pas être modifiée ici.",
      error_max_length: '100 caractères maximum.',
      error_invalid_name: 'Prénom ou nom invalide.',
      error_generic: 'Une erreur est survenue lors de l\'enregistrement. Réessayez.',
      error_save_generic: 'Une erreur est survenue lors de l\'enregistrement. Réessayez.',
      submit: 'Enregistrer',
      success: 'Profil mis à jour avec succès.',
    },
  },
};

const makeDto = (overrides: Partial<ProfileDto> = {}): ProfileDto => ({
  firstName: 'Alexandre',
  lastName: 'Solane',
  email: 'alexandre.solane@example.com',
  avatarUrl: null,
  preferredLanguage: 'fr',
  ...overrides,
});

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const flushProfile = (dto: ProfileDto = makeDto()) => {
    httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush(dto);
    fixture.detectChanges();
  };

  const mockFileInput = (file: File | null) => ({ files: file ? [file] : null, value: '' }) as unknown as HTMLInputElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: frTranslations },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', component: StubComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('creates the component and triggers the initial GET /api/account/profile', () => {
    expect(component).toBeTruthy();
    flushProfile();
  });

  describe('loading / error states', () => {
    it('shows the loading state while the GET is pending', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('[data-testid="profile-loading"]')).not.toBeNull();
      flushProfile();
    });

    it('shows the error state with a retry button on GET failure', () => {
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('[data-testid="profile-error"]')).not.toBeNull();
      expect(component.loadError()).toBe(true);
    });

    it('retry re-fetches and renders the form on success', () => {
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="profile-retry"]').click();
      flushProfile();

      expect(fixture.nativeElement.querySelector('[data-testid="profile-error"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('populates the form with the loaded profile', () => {
      flushProfile();
      expect(component.form.value).toEqual({ firstName: 'Alexandre', lastName: 'Solane' });
    });
  });

  describe('avatar fallback', () => {
    it('shows initials when avatarUrl is null', () => {
      flushProfile(makeDto({ avatarUrl: null }));
      expect(component.initials()).toBe('AS');
      expect(fixture.nativeElement.querySelector('[data-testid="profile-avatar-initials"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="profile-avatar-image"]')).toBeNull();
    });

    it('shows the <img> when avatarUrl is set', () => {
      flushProfile(makeDto({ avatarUrl: 'http://localhost:8080/api/avatars/1/abc.png' }));
      const img = fixture.nativeElement.querySelector('[data-testid="profile-avatar-image"]');
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('http://localhost:8080/api/avatars/1/abc.png');
    });

    it('falls back to email initial when both names are empty', () => {
      flushProfile(makeDto({ firstName: '', lastName: '', email: 'zoe@example.com' }));
      expect(component.initials()).toBe('Z');
    });
  });

  describe('validation', () => {
    it('required errors are announced via aria-describedby + role="alert" after touch', () => {
      flushProfile();
      component.form.controls.firstName.setValue('');
      component.form.controls.firstName.markAsTouched();
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('#firstName');
      const error = fixture.nativeElement.querySelector('#first-name-error');
      expect(input.getAttribute('aria-describedby')).toBe('first-name-error');
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.textContent).toContain('Ce champ est obligatoire.');
    });

    it('rejects a first name longer than 100 characters', () => {
      flushProfile();
      component.form.controls.firstName.setValue('a'.repeat(101));
      expect(component.form.controls.firstName.errors?.['maxlength']).toBeTruthy();
    });

    it('does not submit when the form is invalid, and focuses the first invalid field', () => {
      flushProfile();
      component.form.controls.firstName.setValue('');
      fixture.detectChanges();
      const firstNameEl: HTMLInputElement = fixture.nativeElement.querySelector('#firstName');
      const focusSpy = vi.spyOn(firstNameEl, 'focus');

      component.submit();

      httpMock.expectNone(`${environment.apiUrl}/account/profile`);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('focuses lastName when only lastName is invalid', () => {
      flushProfile();
      component.form.controls.lastName.setValue('');
      fixture.detectChanges();
      const lastNameEl: HTMLInputElement = fixture.nativeElement.querySelector('#lastName');
      const focusSpy = vi.spyOn(lastNameEl, 'focus');

      component.submit();

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('save button — disabled when unchanged / invalid / saving', () => {
    it('is disabled right after load (no changes made yet)', () => {
      flushProfile();
      const btn = fixture.nativeElement.querySelector('[data-testid="profile-submit"]');
      expect(btn.disabled).toBe(true);
      expect(component.hasChanges()).toBe(false);
    });

    it('becomes enabled once a field changes', () => {
      // A real keystroke (native `input` event) is used rather than a direct `setValue()`
      // call: Angular's reactive-forms status/touched are internal signals, and this app is
      // zoneless — a value change that doesn't flip the control's overall VALID/INVALID
      // status (still valid here) does not itself notify any signal consumer, so only a
      // genuine DOM event (which the zoneless scheduler marks the view dirty for) reliably
      // triggers a re-render, matching what actually happens when a user types.
      flushProfile();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('#firstName');
      input.value = 'Jean';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('[data-testid="profile-submit"]');
      expect(btn.disabled).toBe(false);
      expect(component.hasChanges()).toBe(true);
    });

    it('is disabled again after reverting to the original value', () => {
      flushProfile();
      component.form.controls.firstName.setValue('Jean');
      component.form.controls.firstName.setValue('Alexandre');
      fixture.detectChanges();
      expect(component.hasChanges()).toBe(false);
    });

    it('disables the button and shows a spinner while saving', () => {
      flushProfile();
      component.form.controls.firstName.setValue('Jean');
      component.submit();
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('[data-testid="profile-submit"]');
      expect(btn.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();

      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush(makeDto({ firstName: 'Jean' }));
    });

    it('does not send a duplicate PATCH while already saving', () => {
      flushProfile();
      component.form.controls.firstName.setValue('Jean');
      component.submit();
      component.submit();

      const reqs = httpMock.match(`${environment.apiUrl}/account/profile`);
      expect(reqs).toHaveLength(1);
      reqs[0].flush(makeDto({ firstName: 'Jean' }));
    });
  });

  describe('submit()', () => {
    it('PATCHes only firstName/lastName — never an email field', () => {
      flushProfile();
      component.form.setValue({ firstName: 'Jean', lastName: 'Dupont' });
      component.submit();

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ firstName: 'Jean', lastName: 'Dupont' });
      expect(req.request.body.email).toBeUndefined();
      req.flush(makeDto({ firstName: 'Jean', lastName: 'Dupont' }));
    });

    it('shows a success toast and resets hasChanges() on success', () => {
      flushProfile();
      component.form.setValue({ firstName: 'Jean', lastName: 'Dupont' });
      component.submit();
      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush(makeDto({ firstName: 'Jean', lastName: 'Dupont' }));

      expect(toastService.toasts().some(t => t.messageKey === 'account.profile.success' && t.type === 'info')).toBe(true);
      expect(component.hasChanges()).toBe(false);
    });

    it('shows an inline error (not a toast) on 400 INVALID_NAME', () => {
      flushProfile();
      component.form.setValue({ firstName: 'Jean', lastName: 'Dupont' });
      component.submit();
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush({ error: 'INVALID_NAME' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(component.saveError()).toBe('invalid_name');
      expect(fixture.nativeElement.querySelector('[data-testid="profile-save-error"]').textContent).toContain(
        'Prénom ou nom invalide.'
      );
      expect(toastService.toasts().some(t => t.type === 'error')).toBe(false);
    });

    it('shows a localized error toast (not inline) on a network error', () => {
      flushProfile();
      component.form.setValue({ firstName: 'Jean', lastName: 'Dupont' });
      component.submit();
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();

      expect(component.saveError()).toBeNull();
      expect(
        toastService.toasts().some(t => t.type === 'error' && t.messageKey === 'account.profile.error_save_generic')
      ).toBe(true);
    });

    it('re-enables the button after a failed save without reverting the edited values', () => {
      flushProfile();
      component.form.setValue({ firstName: 'Jean', lastName: 'Dupont' });
      component.submit();
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(component.saving()).toBe(false);
      expect(component.form.value).toEqual({ firstName: 'Jean', lastName: 'Dupont' });
      expect(component.hasChanges()).toBe(true);
    });
  });

  describe('avatar upload', () => {
    it('rejects an unsupported format client-side without calling the API', () => {
      flushProfile();
      const file = new File(['x'], 'avatar.gif', { type: 'image/gif' });
      component.onAvatarSelected({ target: mockFileInput(file) } as unknown as Event);
      fixture.detectChanges();

      httpMock.expectNone(`${environment.apiUrl}/account/profile/avatar`);
      expect(component.avatarError()).toBe('invalid_format');
      const error = fixture.nativeElement.querySelector('[data-testid="profile-avatar-error"]');
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.textContent).toContain('Format non supporté');
    });

    it('rejects an oversized file client-side without calling the API', () => {
      flushProfile();
      const big = new File([new Uint8Array(3 * 1024 * 1024)], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(big) } as unknown as Event);
      fixture.detectChanges();

      httpMock.expectNone(`${environment.apiUrl}/account/profile/avatar`);
      expect(component.avatarError()).toBe('too_large');
      expect(fixture.nativeElement.querySelector('[data-testid="profile-avatar-error"]').textContent).toContain(
        'Image trop volumineuse'
      );
    });

    it('uploads a valid file and updates the avatar on success', () => {
      flushProfile();
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(file) } as unknown as Event);
      fixture.detectChanges();

      expect(component.avatarUploading()).toBe(true);
      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile/avatar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      expect((req.request.body as FormData).get('file')).toBe(file);

      req.flush(makeDto({ avatarUrl: 'http://localhost:8080/api/avatars/1/new.png' }));
      fixture.detectChanges();

      expect(component.avatarUploading()).toBe(false);
      expect(component.profile()?.avatarUrl).toBe('http://localhost:8080/api/avatars/1/new.png');
    });

    it('shows an inline error when the backend rejects the format (400 AVATAR_INVALID_FORMAT)', () => {
      flushProfile();
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(file) } as unknown as Event);
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush({ error: 'AVATAR_INVALID_FORMAT' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(component.avatarError()).toBe('invalid_format');
      expect(component.avatarUploading()).toBe(false);
    });

    it('shows an inline error when the backend rejects the size (400 AVATAR_TOO_LARGE)', () => {
      flushProfile();
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(file) } as unknown as Event);
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush({ error: 'AVATAR_TOO_LARGE' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(component.avatarError()).toBe('too_large');
    });

    it('shows a generic inline error on a network failure', () => {
      flushProfile();
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(file) } as unknown as Event);
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile/avatar`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();

      expect(component.avatarError()).toBe('generic');
    });

    it('does nothing when no file is selected', () => {
      flushProfile();
      component.onAvatarSelected({ target: mockFileInput(null) } as unknown as Event);
      httpMock.expectNone(`${environment.apiUrl}/account/profile/avatar`);
      expect(component.avatarError()).toBeNull();
    });

    it('clears a previous avatar error when a new selection is made', () => {
      flushProfile();
      const bad = new File(['x'], 'avatar.gif', { type: 'image/gif' });
      component.onAvatarSelected({ target: mockFileInput(bad) } as unknown as Event);
      expect(component.avatarError()).toBe('invalid_format');

      const good = new File(['x'], 'avatar.png', { type: 'image/png' });
      component.onAvatarSelected({ target: mockFileInput(good) } as unknown as Event);
      expect(component.avatarError()).toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/account/profile/avatar`).flush(makeDto());
    });
  });

  describe('language preference (US02.1.2)', () => {
    const selectEl = (): HTMLSelectElement => fixture.nativeElement.querySelector('[data-testid="profile-language-select"]');

    it('renders a native select with aria-label "Langue préférée" and the current language aria-selected', () => {
      flushProfile();
      const select = selectEl();
      expect(select.tagName).toBe('SELECT');
      expect(select.getAttribute('aria-label')).toBe('Langue préférée');

      const frOption = select.querySelector('option[value="fr"]') as HTMLOptionElement;
      const enOption = select.querySelector('option[value="en"]') as HTMLOptionElement;
      expect(frOption.getAttribute('aria-selected')).toBe('true');
      expect(enOption.getAttribute('aria-selected')).toBeNull();
    });

    it('switches the active Transloco language instantly on change, before the PATCH resolves', () => {
      flushProfile();
      const transloco = TestBed.inject(TranslocoService);

      selectEl().value = 'en';
      selectEl().dispatchEvent(new Event('change'));

      expect(transloco.getActiveLang()).toBe('en');

      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });
    });

    it('PATCHes /account/profile with exactly { preferredLanguage }', () => {
      flushProfile();
      selectEl().value = 'en';
      selectEl().dispatchEvent(new Event('change'));

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ preferredLanguage: 'en' });
      req.flush({ preferredLanguage: 'en' });
    });

    it('disables the select while the save is in flight', () => {
      flushProfile();
      selectEl().value = 'en';
      selectEl().dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(selectEl().disabled).toBe(true);
      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });
    });

    it('shows a confirmation toast on success', () => {
      flushProfile();
      selectEl().value = 'en';
      selectEl().dispatchEvent(new Event('change'));
      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });

      expect(toastService.toasts().some(t => t.messageKey === 'account.preferences.success' && t.type === 'info')).toBe(true);
    });

    it('reverts to the previous language and shows an error toast on a network failure', () => {
      flushProfile();
      const transloco = TestBed.inject(TranslocoService);

      selectEl().value = 'en';
      selectEl().dispatchEvent(new Event('change'));
      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });

      expect(transloco.getActiveLang()).toBe('fr');
      expect(
        toastService.toasts().some(t => t.messageKey === 'account.preferences.error_save_generic' && t.type === 'error')
      ).toBe(true);
    });

    it('ignores an unsupported select value defensively', () => {
      flushProfile();
      component.onLanguageChange({ target: { value: 'de' } } as unknown as Event);
      httpMock.expectNone(`${environment.apiUrl}/account/profile`);
    });
  });

  describe('goBack()', () => {
    it('does not throw', () => {
      flushProfile();
      expect(() => component.goBack()).not.toThrow();
    });
  });
});
