import { Component } from '@angular/core';
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
}
