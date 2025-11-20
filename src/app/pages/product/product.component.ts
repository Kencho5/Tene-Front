import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, finalize } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductsService } from '@core/services/products.service';
import { ProductResponse } from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-product',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  readonly product = signal<ProductResponse | null>(null);
  readonly isLoading = signal(true);
  readonly images = computed(() => this.product()?.images ?? []);

  readonly imageUrl = environment.product_image_url;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.loadProduct(params['product_id']);
    });
  }

  private loadProduct(productId: string): void {
    this.isLoading.set(true);

    this.productsService
      .getProduct(productId)
      .pipe(
        catchError((error) => {
          console.error('Failed to load product:', error);
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((product) => this.product.set(product));
  }

  navigateBack(): void {
    this.location.back();
  }

  getImageSrc(image_uuid: string): string {
    const productId = this.product()?.product.id;
    return `${this.imageUrl}/products/${productId}/${image_uuid}.jpg`;
  }
}
