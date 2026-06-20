import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'piv-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed">
      <div class="sidebar__logo">
        @if (!collapsed) { <span>PIVOT</span> }
        @else { <span>P</span> }
      </div>

      <nav class="sidebar__nav">
        @for (item of visibleItems(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="is-active"
             class="sidebar__item" [class.sidebar__item--icon-only]="collapsed"
             [title]="collapsed ? item.label : ''">
            <span class="sidebar__icon" [innerHTML]="item.icon"></span>
            @if (!collapsed) { <span class="sidebar__label">{{ item.label }}</span> }
          </a>
        }
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__collapse-btn" (click)="toggle.emit()" [attr.aria-label]="collapsed ? 'Développer' : 'Réduire'">
          @if (collapsed) { › } @else { ‹ }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      background: var(--surface-sidebar);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-base);
      flex-shrink: 0;
    }
    .sidebar--collapsed { width: 60px; }
    .sidebar__logo {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      font-size: var(--text-lg);
      font-weight: 700;
      color: #fff;
      border-bottom: 1px solid rgba(255,255,255,.1);
      white-space: nowrap;
      overflow: hidden;
    }
    .sidebar__nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sidebar__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: rgba(255,255,255,.65);
      font-size: var(--text-sm);
      font-weight: 500;
      text-decoration: none;
      transition: background var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;

      &:hover { background: rgba(255,255,255,.08); color: #fff; }
      &.is-active { background: rgba(255,255,255,.12); color: #fff; }
      &--icon-only { padding: 10px; justify-content: center; }
    }
    .sidebar__icon { font-size: 16px; flex-shrink: 0; }
    .sidebar__footer {
      padding: 12px 8px;
      border-top: 1px solid rgba(255,255,255,.1);
    }
    .sidebar__collapse-btn {
      width: 100%;
      padding: 8px;
      background: rgba(255,255,255,.06);
      border: none;
      border-radius: var(--radius-md);
      color: rgba(255,255,255,.6);
      cursor: pointer;
      font-size: 18px;
      &:hover { background: rgba(255,255,255,.12); color: #fff; }
    }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();

  private allItems: NavItem[] = [
    { label: 'Tableau de bord', icon: '▦', route: '/dashboard' },
    { label: 'Administration', icon: '⚙', route: '/admin', roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
  ];

  constructor(private auth: AuthService) {}

  visibleItems(): NavItem[] {
    const role = this.auth.currentUser()?.role;
    return this.allItems.filter(item =>
      !item.roles || (role && item.roles.includes(role))
    );
  }
}
