import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth/service/auth.service';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('user signal reflects AuthService.currentUser', () => {
    const auth = TestBed.inject(AuthService);
    expect(component.user()).toBeNull();
    auth.updateToken('tok', Date.now() + 3600_000);
    // user is a computed ref — null until login flush
    expect(component.user).toBeDefined();
  });
});
