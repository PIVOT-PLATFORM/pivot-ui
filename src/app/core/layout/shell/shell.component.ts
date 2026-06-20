import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'piv-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="shell" [class.shell--collapsed]="sidebarCollapsed()">
      <piv-sidebar [collapsed]="sidebarCollapsed()" (toggle)="sidebarCollapsed.set(!sidebarCollapsed())"/>
      <div class="shell__main">
        <piv-navbar (menuToggle)="sidebarCollapsed.set(!sidebarCollapsed())"/>
        <main class="shell__content">
          <router-outlet/>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .shell__content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--surface-bg);
    }
  `]
})
export class ShellComponent {
  sidebarCollapsed = signal(false);
}
