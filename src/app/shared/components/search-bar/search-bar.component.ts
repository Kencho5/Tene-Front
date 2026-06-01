import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { ProductImage, ProductResponse } from '@core/interfaces/products.interface';
import { ProductsService } from '@core/services/products/products.service';
import { SharedModule } from '@shared/shared.module';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateSlug } from '@utils/slug';
import { buildSearchParams, isProductId } from '@utils/product-id';

@Component({
  selector: 'app-search-bar',
  imports: [SharedModule, OutsideClickDirective],
  templateUrl: './search-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes panel-enter {
      from {
        opacity: 0;
        transform: translateY(-6px);
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
export class SearchBarComponent {
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly query = signal('');
  readonly debouncedQuery = signal('');
  readonly focused = signal(false);
  private debounceTimer?: number;

  readonly searchLinkParams = computed(() => {
    const value = this.query().trim();
    return isProductId(value) ? { id: value } : { query: value };
  });

  readonly showPanel = computed(
    () => this.focused() && this.query().trim().length > 0,
  );

  updateQuery(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debouncedQuery.set(value);
    }, 350);
  }

  readonly results = rxResource({
    params: () => this.debouncedQuery(),
    stream: ({ params }) => {
      if (!params) {
        return of(undefined);
      }
      const queryString = buildSearchParams(params, { limit: '5' });
      return this.productsService.searchProduct(queryString);
    },
  });

  submit(): void {
    const value = this.query().trim();
    if (!value) {
      return;
    }
    this.close();
    this.router.navigate(['/search'], { queryParams: this.searchLinkParams() });
  }

  close(): void {
    this.focused.set(false);
    this.searchInput()?.nativeElement.blur();
  }

  getImageSrc(productId: string, image: ProductImage): string {
    return getProductImageUrl(productId, image.image_uuid, image.extension);
  }

  openProduct(result: ProductResponse): void {
    this.close();
    const slug = result.seo?.slug?.trim() || generateSlug(result.data.name);
    this.router.navigate(['/products', slug, result.data.id]);
  }
}
