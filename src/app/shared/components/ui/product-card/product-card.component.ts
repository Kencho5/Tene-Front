import { Component, computed, input } from '@angular/core';
import { ProductResponse } from '@core/interfaces/products.interface';
import { SharedModule } from '@shared/shared.module';
import { ImageComponent } from '../image/image.component';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-product-card',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  readonly imageBaseUrl = environment.product_image_url;
  readonly product = input.required<ProductResponse>();
  readonly productImage = computed(() => {
    const primaryImage = this.product().images.find((image) => image.is_primary);
    if (!primaryImage) return '';

    return `${this.imageBaseUrl}/products/${this.product().product.id}/${primaryImage.image_uuid}.jpg`;
  });
}
