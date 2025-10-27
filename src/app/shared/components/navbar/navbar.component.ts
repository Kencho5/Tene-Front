import { Component, signal } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { navUrls } from '@utils/navUrls';

@Component({
  selector: 'app-navbar',
  imports: [SharedModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  mobileMenuOpen = signal(false);
  navUrls = navUrls;

  toggleMobileMenu() {
    this.mobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
