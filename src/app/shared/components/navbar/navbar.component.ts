import { Component, inject, signal } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { navUrls } from '@utils/navUrls';
import { AuthService } from '@core/services/auth-service.service';

@Component({
  selector: 'app-navbar',
  imports: [SharedModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  mobileMenuOpen = signal(false);
  navUrls = navUrls;

  toggleMobileMenu() {
    this.mobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
