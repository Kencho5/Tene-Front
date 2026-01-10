import { Component, signal } from '@angular/core';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { SharedModule } from '@shared/shared.module';
import {
  productCategoryCards,
  productTopCategoryCards,
  productBrandCards,
} from '@utils/productsCards';

@Component({
  selector: 'app-products',
  imports: [SharedModule, ProductCardComponent, ImageComponent],
  templateUrl: './products.component.html',
  styles: `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class ProductsComponent {
  readonly productCategoryCards = productCategoryCards;
  readonly productTopCategoryCards = productTopCategoryCards;
  readonly productBrandCards = productBrandCards;
  readonly scrollStates = signal<Record<string, boolean>>({});

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
