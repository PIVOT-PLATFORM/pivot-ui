import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BoardPreviewComponent } from './board-preview.component';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';

const API = 'http://localhost:8083/api/collaboratif';
const previewUrl = (id: string) => `${API}/whiteboard/boards/${id}/preview`;

/** Immediately reports the observed element as intersecting so the lazy load fires in tests. */
class ImmediateIntersectionObserver {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe(): void {
    this.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect(): void {}
  unobserve(): void {}
}

describe('BoardPreviewComponent', () => {
  let fixture: ComponentFixture<BoardPreviewComponent>;
  let httpMock: HttpTestingController;
  const originalIO = globalThis.IntersectionObserver;

  afterAll(() => {
    globalThis.IntersectionObserver = originalIO;
  });

  beforeEach(async () => {
    globalThis.IntersectionObserver =
      ImmediateIntersectionObserver as unknown as typeof IntersectionObserver;
    await TestBed.configureTestingModule({
      imports: [BoardPreviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: API },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardPreviewComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('boardId', 'b1');
    fixture.detectChanges(); // ngOnInit → immediate load (no IntersectionObserver in jsdom)
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders frames and cards as SVG rects after the preview loads', () => {
    httpMock.expectOne(previewUrl('b1')).flush({
      frames: [{ posX: 0, posY: 0, width: 400, height: 300, color: '#94A3B8' }],
      cards: [
        { type: 'TEXT', posX: 10, posY: 20, width: 100, height: 80, color: '#FFEB3B' },
        { type: 'SHAPE', posX: 200, posY: 50, width: 60, height: 60, color: '#ef4444' },
      ],
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const svg = el.querySelector('svg.board-preview__svg');
    expect(svg).toBeTruthy();
    // 1 frame rect (fill none) + 2 card rects.
    expect(el.querySelectorAll('rect').length).toBe(3);
    const filled = Array.from(el.querySelectorAll('rect')).filter((r) => r.getAttribute('fill') !== 'none');
    expect(filled.map((r) => r.getAttribute('fill'))).toEqual(['#FFEB3B', '#ef4444']);
    // viewBox encloses content (min -pad) — starts at -24 -24.
    expect(svg?.getAttribute('viewBox')).toContain('-24 -24');
    expect(el.querySelector('.board-preview__placeholder')).toBeNull();
  });

  it('falls back to a neutral fill for a card with a transparent colour (e.g. IMAGE)', () => {
    httpMock.expectOne(previewUrl('b1')).flush({
      frames: [],
      cards: [{ type: 'IMAGE', posX: 0, posY: 0, width: 50, height: 50, color: 'transparent' }],
    });
    fixture.detectChanges();

    const rect = fixture.nativeElement.querySelector('rect');
    expect(rect.getAttribute('fill')).toBe('#cbd5e1');
  });

  it('shows the placeholder (no SVG) for an empty board', () => {
    httpMock.expectOne(previewUrl('b1')).flush({ frames: [], cards: [] });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('svg')).toBeNull();
    expect(el.querySelector('.board-preview__placeholder')).toBeTruthy();
  });

  it('shows the placeholder on a preview HTTP error', () => {
    httpMock.expectOne(previewUrl('b1')).flush('', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('svg')).toBeNull();
    expect(el.querySelector('.board-preview__placeholder')).toBeTruthy();
  });
});
