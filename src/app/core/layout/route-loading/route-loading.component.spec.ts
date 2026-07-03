import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  type Event as RouterEvent,
} from '@angular/router';
import { Subject } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RouteLoadingComponent, ROUTE_LOADING_DELAY_MS } from './route-loading.component';

/**
 * US01.1.4 — AC indicateur de chargement :
 * - navigation > 500 ms → indicateur affiché ;
 * - fin de navigation → indicateur masqué ;
 * - role="status" + aria-label="Chargement en cours..." annoncé aux lecteurs d'écran.
 */
describe('RouteLoadingComponent', () => {
  let fixture: ComponentFixture<RouteLoadingComponent>;
  let events: Subject<RouterEvent>;

  beforeEach(async () => {
    vi.useFakeTimers();
    events = new Subject<RouterEvent>();
    await TestBed.configureTestingModule({
      imports: [
        RouteLoadingComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: { common: { loading: 'Chargement en cours...' } } },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
        }),
      ],
      providers: [{ provide: Router, useValue: { events: events.asObservable() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteLoadingComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function indicator(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.route-loading');
  }

  it('n affiche rien au repos', () => {
    expect(indicator()).toBeNull();
  });

  // Assertion stricte (toBe(false), pas seulement l'absence DOM) : distingue
  // un signal initialisé à `false` d'un signal `undefined` (les deux sont
  // falsy dans le template @if, mais seul `false` correspond au contrat de
  // ROUTE_LOADING_DELAY_MS / initialValue documenté).
  it('le signal visible() vaut strictement false au repos', () => {
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('ignore un événement routeur étranger (ni Start/End/Cancel/Error) sans interrompre un chargement en cours', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(200);

    // Événement hors du filtre métier (ni NavigationStart/End/Cancel/Error) :
    // ne doit ni annuler ni perturber le timer de 500 ms en cours.
    events.next({} as RouterEvent);

    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS - 200);
    fixture.detectChanges();
    expect(indicator()).not.toBeNull();
  });

  it('n affiche pas l indicateur avant 500 ms (pas de flash visuel)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS - 1);
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('affiche l indicateur quand la navigation dure plus de 500 ms (AC)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();
    expect(indicator()).not.toBeNull();
  });

  it('n affiche jamais l indicateur si la navigation se termine avant 500 ms', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(200);
    events.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('masque l indicateur à la fin de la navigation (NavigationEnd)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();
    expect(indicator()).not.toBeNull();

    events.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('masque l indicateur sur NavigationCancel (guard qui refuse)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();

    events.next(new NavigationCancel(1, '/dashboard', 'guard rejected'));
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('masque l indicateur sur NavigationError', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();

    events.next(new NavigationError(1, '/dashboard', new Error('chunk load failed')));
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  // US01.1.4 — AC accessibilité
  it('expose role="status" et aria-label="Chargement en cours..." (AC A11y)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();

    const el = indicator();
    expect(el).not.toBeNull();
    expect(el!.getAttribute('role')).toBe('status');
    expect(el!.getAttribute('aria-label')).toBe('Chargement en cours...');
  });

  it('le spinner décoratif est aria-hidden et le texte sr-only est présent (AC A11y)', () => {
    events.next(new NavigationStart(1, '/dashboard'));
    vi.advanceTimersByTime(ROUTE_LOADING_DELAY_MS);
    fixture.detectChanges();

    const el = indicator()!;
    const spinner = el.querySelector('.route-loading__spinner');
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.sr-only')?.textContent).toBe('Chargement en cours...');
  });
});
