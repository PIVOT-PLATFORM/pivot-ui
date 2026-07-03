import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './shell.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ModuleAccessOverlayComponent } from '../../modules/module-access-overlay.component';

@Component({ selector: 'piv-navbar', template: '', standalone: true })
class StubNavbar {}

@Component({ selector: 'piv-footer', template: '', standalone: true })
class StubFooter {}

@Component({ selector: 'piv-module-access-overlay', template: '', standalone: true })
class StubModuleAccessOverlay {}

@Component({ template: '', standalone: true })
class StubRoute {}

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let component: ShellComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([{ path: '**', component: StubRoute }])],
    })
      .overrideComponent(ShellComponent, {
        remove: { imports: [NavbarComponent, FooterComponent, ModuleAccessOverlayComponent] },
        add: { imports: [StubNavbar, StubFooter, StubModuleAccessOverlay] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders shell layout structure', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.shell')).toBeTruthy();
    expect(el.querySelector('.shell__content')).toBeTruthy();
    expect(el.querySelector('.shell__page')).toBeTruthy();
  });

  it('renders navbar stub', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('piv-navbar')).toBeTruthy();
  });

  it('renders footer stub', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('piv-footer')).toBeTruthy();
  });
});
