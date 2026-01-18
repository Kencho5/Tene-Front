import { Component, input } from '@angular/core';
import { ProductResponse } from '@core/interfaces/products.interface';
import { SharedModule } from '@shared/shared.module';
import { ImageComponent } from '../image/image.component';

@Component({
  selector: 'app-product-card',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  readonly product = input.required<ProductResponse>();
}
