import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from '@core/services/products/products.service';
import { CategoriesService } from '@core/services/categories/categories.service';
import { map, catchError } from 'rxjs';
import { of } from 'rxjs';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { SharedModule } from '@shared/shared.module';
import {
  productTopCategoryCards,
  productBrandCards,
} from '@utils/productsCards';
import { SeoService } from '@core/services/seo/seo.service';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';

@Component({
  selector: 'app-products',
  imports: [SharedModule, ProductCardComponent, ImageComponent, DragScrollDirective],
  templateUrl: './products.component.html',
  styles: `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class ProductsComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly seoService = inject(SeoService);

  readonly productTopCategoryCards = productTopCategoryCards;
  readonly productBrandCards = productBrandCards;
  readonly scrollStates = signal<Record<string, boolean>>({});

  readonly categoriesTree = toSignal(
    this.categoriesService
      .getCategoryTree()
      .pipe(catchError(() => of({ categories: [] }))),
    { initialValue: { categories: [] } },
  );

  readonly topLevelCategories = computed(() => {
    const tree = this.categoriesTree();
    return tree.categories.slice(0, 8);
  });

  readonly searchResponse = toSignal(
    this.productsService.searchProduct('').pipe(
      map((response) => {
        return response;
      }),
    ),
    { initialValue: { products: [], total: 0, limit: 0, offset: 0 } },
  );

  readonly products = computed(() => this.searchResponse().products);

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'პროდუქცია - USB კაბელები და ტექნიკა | Tene',
      description:
        'ყველა პროდუქტი ერთ ადგილას ★ USB Type-C, Lightning, Micro-USB კაბელები ★ Apple, Anker, Logitech ★ დამტენები, ყურსასმენები, აქსესუარები ★ 30% ფასდაკლება',
      url: 'https://tene.ge/products',
      type: 'website',
      keywords:
        'USB კაბელები, Type-C კაბელი, Lightning კაბელი, დამტენი, ყურსასმენები, Apple აქსესუარები, ტექნიკა, კატალოგი',
    });
  }

  scrollLeft(element: HTMLElement) {
    element.scrollBy({ left: -300, behavior: 'smooth' });
  }

  scrollRight(element: HTMLElement) {
    element.scrollBy({ left: 300, behavior: 'smooth' });
  }

  onScroll(element: HTMLElement, sectionId: string) {
    this.scrollStates.update((states) => ({
      ...states,
      [sectionId]: element.scrollLeft > 0,
    }));
  }

  canScrollLeft(sectionId: string): boolean {
    return this.scrollStates()[sectionId] || false;
  }

  getBrandGradient(color: string): string {
    const gradients: Record<string, string> = {
      cream:
        'linear-gradient(270deg, rgba(247, 193, 82, 0.45) 0%, transparent 50%)',
      pear: 'linear-gradient(270deg, rgba(243, 249, 144, 0.5) 0%, transparent 50%)',
      info: 'linear-gradient(270deg, rgba(2, 132, 199, 0.45) 0%, transparent 50%)',
    };
    return gradients[color] || gradients['cream'];
  }
}
