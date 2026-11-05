import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth/auth-service.service';
import { LoadingService } from '@core/services/loading.service';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { ADMIN_NAV_SECTIONS, AdminNavSection, OPERATOR_ROUTES } from './admin-nav';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AdminHeaderComponent } from './admin-header.component';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, SpinnerComponent, AdminSidebarComponent, AdminHeaderComponent],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  protected readonly loadingService = inject(LoadingService);

  protected readonly user = this.authService.user;
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileSidebarOpen = signal(false);

  protected readonly navSections = computed<AdminNavSection[]>(() => {
    if (this.authService.isAdmin()) {
      return ADMIN_NAV_SECTIONS;
    }
    return ADMIN_NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => OPERATOR_ROUTES.has(item.route)),
    })).filter((section) => section.items.length > 0);
  });
  protected logout(): void {
    this.authService.logout();
  }
}
