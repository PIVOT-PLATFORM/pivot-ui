import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ModuleAccessOverlayComponent } from './module-access-overlay.component';
import { ModuleGuardLoadingService } from './module-guard-loading.service';

describe('ModuleAccessOverlayComponent', () => {
  let fixture: ComponentFixture<ModuleAccessOverlayComponent>;
  let loading: ModuleGuardLoadingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ModuleAccessOverlayComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleAccessOverlayComponent);
    loading = TestBed.inject(ModuleGuardLoadingService);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not render the overlay when no guard check is pending', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.module-access-overlay')).toBeNull();
  });

  it('renders a role="status" overlay while a guard check is pending', () => {
    loading.start();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const overlay = el.querySelector('.module-access-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute('role')).toBe('status');
  });

  it('hides the overlay again once the guard check settles', () => {
    loading.start();
    fixture.detectChanges();
    loading.end();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.module-access-overlay')).toBeNull();
  });
});
