import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { AuthService } from '@core/services/auth/auth-service.service';
import { SharedModule } from '@shared/shared.module';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [SharedModule],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);

  readonly user = this.authService.user;
  readonly isSidebarOpen = signal(true);
  readonly isMobileSidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'პროდუქტები', route: '/admin/products', icon: 'products' },
    { label: 'შეკვეთები', route: '/admin/orders', icon: 'orders' },
    { label: 'მომხმარებლები', route: '/admin/users', icon: 'users' },
  ];

  toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update((value) => !value);
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  goBack(): void {
    this.location.back();
  }

  logout(): void {
    this.authService.logout();
  }
}
