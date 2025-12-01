import { Component, inject, signal } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { navUrls } from '@utils/navUrls';
import { AuthService } from '@core/services/auth/auth-service.service';
import { CartService } from '@core/services/products/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [SharedModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);

  mobileMenuOpen = signal(false);
  navUrls = navUrls;

  toggleMobileMenu() {
    this.mobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
