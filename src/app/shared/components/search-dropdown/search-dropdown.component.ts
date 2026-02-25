import { Component, inject, model, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { CategoryTreeResponse } from '@core/interfaces/categories.interface';
import { CategoriesService } from '@core/services/categories/categories.service';
import { SharedModule } from '@shared/shared.module';
import { SpinnerComponent } from '../ui/spinner/spinner.component';
import { ProductImage } from '@core/interfaces/products.interface';
import { ProductsService } from '@core/services/products/products.service';
import { getProductImageUrl } from '@utils/product-image-url';
import { Router } from '@angular/router';
import { generateSlug } from '@utils/slug';

@Component({
  selector: 'app-search-dropdown',
  imports: [SharedModule, OutsideClickDirective, SpinnerComponent],
  templateUrl: './search-dropdown.component.html',
})
export class SearchDropdownComponent {
  private readonly categoriesService = inject(CategoriesService);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  readonly open = model(false);
  readonly query = signal('');

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
    params: () => this.query(),
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
  }

  close() {
    this.open.set(false);
  }

  getImageSrc(productId: number, image: ProductImage): string {
    return getProductImageUrl(productId, image.image_uuid, image.extension);
  }

  openProduct(id: number, name: string): void {
    this.router.navigate(['/products', generateSlug(name), id]);
  }
}
