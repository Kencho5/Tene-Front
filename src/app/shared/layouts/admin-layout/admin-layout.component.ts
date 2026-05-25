import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Location } from '@angular/common';
import { AuthService } from '@core/services/auth/auth-service.service';
import { LoadingService } from '@core/services/loading.service';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { SharedModule } from '@shared/shared.module';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  imports: [SharedModule, SpinnerComponent],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);
  public readonly loadingService = inject(LoadingService);

  readonly user = this.authService.user;
  readonly isSidebarOpen = signal(true);
  readonly isMobileSidebarOpen = signal(false);

  private readonly allSections: NavSection[] = [
    {
      title: 'ვაჭრობა',
      items: [
        { label: 'შეკვეთები', route: '/admin/orders', icon: 'orders' },
        { label: 'გადახდის ბმული', route: '/admin/payment-link', icon: 'payment-link' },
        { label: 'მომხმარებლები', route: '/admin/users', icon: 'users' },
      ],
    },
    {
      title: 'კატალოგი',
      items: [
        { label: 'პროდუქტები', route: '/admin/products', icon: 'products' },
        { label: 'ტოპ პროდუქტები', route: '/admin/top-products', icon: 'top-products' },
        { label: 'ბრენდები', route: '/admin/brands', icon: 'brands' },
        { label: 'კატეგორიები', route: '/admin/categories', icon: 'categories' },
        { label: 'კაბელის ტიპები', route: '/admin/cable-types', icon: 'cable-specs' },
      ],
    },
    {
      title: 'სამუშაო',
      items: [
        { label: 'ანალიტიკა', route: '/admin/analytics', icon: 'analytics' },
        { label: 'ტასკები', route: '/admin/tasks', icon: 'tasks' },
      ],
    },
  ];

  readonly navSections = computed<NavSection[]>(() => {
    if (this.authService.isAdmin()) {
      return this.allSections;
    }
    return this.allSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.route === '/admin/orders' || item.route === '/admin/payment-link',
        ),
      }))
      .filter((section) => section.items.length > 0);
  });

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
