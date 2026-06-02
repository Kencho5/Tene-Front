import { Component, computed, HostListener, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../shared.module';
import { AuthService } from '@core/services/auth/auth-service.service';
import { CartService } from '@core/services/products/cart.service';
import { CategoriesService } from '@core/services/categories/categories.service';
import {
  CategoryTreeNode,
  CategoryTreeResponse,
} from '@core/interfaces/categories.interface';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { MenuContentComponent } from './menu-content/menu-content.component';

@Component({
  selector: 'app-navbar',
  imports: [SharedModule, SearchBarComponent, MenuContentComponent],
  templateUrl: './navbar.component.html',
  styles: `
    @keyframes skeleton-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .shimmer {
      background: linear-gradient(90deg, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.12) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
  `,
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  private readonly categoriesService = inject(CategoriesService);

  readonly showCategories = input(false);

  readonly menuOpen = signal(false);

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update((value) => !value);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
  }

  readonly categories = rxResource({
    defaultValue: {} as CategoryTreeResponse,
    params: () => true,
    stream: () => this.categoriesService.getCategoryTree(),
  });

  readonly sortedCategories = computed<CategoryTreeNode[]>(() => {
    const all = this.categories.value().categories ?? [];
    const priorityIds = [66, 2, 3, 9];
    const priority = priorityIds
      .map((id) => all.find((c) => c.id === id))
      .filter(Boolean) as CategoryTreeNode[];
    const rest = all.filter((c) => !priorityIds.includes(c.id));
    return [...priority, ...rest];
  });
}
