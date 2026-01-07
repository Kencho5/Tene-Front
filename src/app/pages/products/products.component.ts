import { Component, signal } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { productCategoriesCards } from '@utils/productsCards';

@Component({
  selector: 'app-products',
  imports: [SharedModule],
  templateUrl: './products.component.html',
  styles: `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class ProductsComponent {
  productCategoriesCards = productCategoriesCards;
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
}
