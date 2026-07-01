import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal, computed, Component } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import type { UserInfo } from '../../core/auth/service/auth.service';
import { ModuleRegistryService } from '../../core/modules/module-registry.service';
import type { PivotModuleUi } from '../../core/modules/module.model';

@Component({ template: '', standalone: true })
class StubComponent {}

function makeUser(partial: Partial<UserInfo> = {}): UserInfo {
  return {
    id: 1,
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Dupont',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'acme',
    ...partial,
  };
}

function makeModule(partial: Partial<PivotModuleUi> = {}): PivotModuleUi {
  return {
    id: 'whiteboard',
    name: 'Whiteboard',
    version: '1.0.0',
    enabled: true,
    status: 'online',
    icon: '<svg></svg>',
    description: 'Tableau blanc',
    route: '/whiteboard',
    comingSoon: false,
    color: '#7C3AED',
    ...partial,
  };
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let mockRegistryService: Partial<ModuleRegistryService>;

  const activeModulesSignal = signal<PivotModuleUi[]>([]);
  const comingSoonSignal = signal<PivotModuleUi[]>([]);

  beforeEach(async () => {
    mockRegistryService = {
      activeModules: computed(() => activeModulesSignal()),
      comingSoonModules: computed(() => comingSoonSignal()),
      loadModules: () => of([]),
    } as unknown as ModuleRegistryService;

    activeModulesSignal.set([]);
    comingSoonSignal.set([]);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        { provide: ModuleRegistryService, useValue: mockRegistryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('mounts without error', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('displays greeting with user first name', () => {
    Object.defineProperty(component, 'user', {
      get: () => computed(() => makeUser({ firstName: 'Alice' })),
    });
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent).toContain('Alice');
  });

  it('falls back to email when firstName is null', () => {
    Object.defineProperty(component, 'user', {
      get: () => computed(() => makeUser({ firstName: null as unknown as string })),
    });
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent).toContain('alice@example.com');
  });

  it('shows skeleton cards while loading', () => {
    fixture.detectChanges();
    component.loading.set(true);
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('.module-card--skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('hides skeleton after load completes', () => {
    component.loading.set(false);
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('.module-card--skeleton');
    expect(skeletons).toHaveLength(0);
  });

  it('shows empty state when activeModules=[] and comingSoonModules=[]', () => {
    activeModulesSignal.set([]);
    comingSoonSignal.set([]);
    component.loading.set(false);
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.home__empty');
    expect(empty).not.toBeNull();
  });

  it('shows "no module activated" empty state when coming soon exist but active empty', () => {
    activeModulesSignal.set([]);
    comingSoonSignal.set([makeModule({ comingSoon: true, enabled: false })]);
    component.loading.set(false);
    fixture.detectChanges();
    const emptyText = fixture.nativeElement.querySelector('.home__empty-text');
    expect(emptyText?.textContent).toContain('Aucun module activé');
  });

  it('renders active module cards', () => {
    activeModulesSignal.set([makeModule(), makeModule({ id: 'session', name: 'Session' })]);
    comingSoonSignal.set([]);
    component.loading.set(false);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.module-card--active');
    expect(cards).toHaveLength(2);
  });

  it('does not show empty state when active modules exist', () => {
    activeModulesSignal.set([makeModule()]);
    component.loading.set(false);
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.home__empty');
    expect(empty).toBeNull();
  });

  it('renders coming-soon cards with badge', () => {
    comingSoonSignal.set([makeModule({ comingSoon: true, id: 'quiz', name: 'Quiz' })]);
    activeModulesSignal.set([]);
    component.loading.set(false);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.module-card__badge');
    expect(badge?.textContent.trim()).toBe('À VENIR');
  });

  it('hides skeleton on registry load error', () => {
    mockRegistryService.loadModules = () => throwError(() => new Error('Network error'));
    component.loading.set(true);
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
  });

  it('falls back to "vous" when firstName and email are both null', () => {
    Object.defineProperty(component, 'user', {
      get: () => computed(() => null),
    });
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1?.textContent).toContain('vous');
  });

  it('hexToRgba converts #7C3AED with alpha 0.1 correctly', () => {
    const result = component.hexToRgba('#7C3AED', 0.1);
    expect(result).toBe('rgba(124, 58, 237, 0.1)');
  });
});
