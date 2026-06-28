import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
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

  it('renders h1 title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')).toBeTruthy();
  });
});
