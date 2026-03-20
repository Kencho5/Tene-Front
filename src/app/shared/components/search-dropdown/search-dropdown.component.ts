import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { CategoryTreeResponse } from '@core/interfaces/categories.interface';
import { CategoriesService } from '@core/services/categories/categories.service';
import { SharedModule } from '@shared/shared.module';
import { ProductImage } from '@core/interfaces/products.interface';
import { ProductsService } from '@core/services/products/products.service';
import { getProductImageUrl } from '@utils/product-image-url';
import { Router } from '@angular/router';
import { generateSlug } from '@utils/slug';

@Component({
  selector: 'app-search-dropdown',
  imports: [SharedModule, OutsideClickDirective],
  templateUrl: './search-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes dropdown-enter {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes dropdown-leave {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
      }
    }

    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes skeleton-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .shimmer {
      background: linear-gradient(90deg, var(--color-platinum-10) 25%, var(--color-platinum-20) 50%, var(--color-platinum-10) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
  `,
})
export class SearchDropdownComponent {
  private readonly categoriesService = inject(CategoriesService);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  readonly open = model(false);
  readonly query = signal('');
  readonly debouncedQuery = signal('');
  private debounceTimer?: number;

  updateQuery(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debouncedQuery.set(value);
    }, 350);
  }

  readonly categories = rxResource({
    defaultValue: {} as CategoryTreeResponse,
    params: () => (this.open() ? true : undefined),
    stream: ({ params }) => {
      if (!params) {
        return of({} as CategoryTreeResponse);
      }
      return this.categoriesService.getCategoryTree();
    },
  });

  readonly results = rxResource({
    params: () => this.debouncedQuery(),
    stream: ({ params }) => {
      if (!params) {
        return of(undefined);
      }
      const queryString = new URLSearchParams({ query: params, limit: '5' }).toString();
      return this.productsService.searchProduct(queryString);
    },
  });

  toggle() {
    this.open.update((value) => !value);
    this.query.set('');
    this.debouncedQuery.set('');
    clearTimeout(this.debounceTimer);
  }

  close() {
    this.open.set(false);
  }

  getImageSrc(productId: string, image: ProductImage): string {
    return getProductImageUrl(productId, image.image_uuid, image.extension);
  }

  openProduct(id: string, name: string): void {
    this.router.navigate(['/products', generateSlug(name), id]);
  }
}
