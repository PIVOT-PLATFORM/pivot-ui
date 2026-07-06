import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AccountDeletionBannerComponent } from './account-deletion-banner.component';
import { AccountDeletionStateService } from './account-deletion-state.service';
import { installMemoryLocalStorage } from './testing/memory-local-storage';

describe('AccountDeletionBannerComponent', () => {
  let fixture: ComponentFixture<AccountDeletionBannerComponent>;
  let state: AccountDeletionStateService;

  beforeEach(async () => {
    installMemoryLocalStorage();
    await TestBed.configureTestingModule({
      imports: [AccountDeletionBannerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDeletionBannerComponent);
    state = TestBed.inject(AccountDeletionStateService);
  });

  afterEach(() => window.localStorage.clear());

  it('renders nothing when there is no pending deletion', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-banner"]')).toBeNull();
  });

  it('renders the persistent banner with a cancel link when a deletion is pending', () => {
    state.record(new Date(Date.now() + 86_400_000).toISOString());
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[data-testid="account-deletion-banner"]');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('status');

    const cancelLink = fixture.nativeElement.querySelector('[data-testid="account-deletion-banner-cancel"]');
    expect(cancelLink).not.toBeNull();
    expect(cancelLink.getAttribute('href')).toBe('/account/deletion/cancel');
  });

  it('stops rendering once the grace period has elapsed', () => {
    state.record(new Date(Date.now() - 1000).toISOString());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-banner"]')).toBeNull();
  });
});
