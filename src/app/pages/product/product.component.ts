import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, finalize } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductsService } from '@core/services/products.service';
import { Product } from '@core/interfaces/products.interface';

@Component({
  selector: 'app-product',
  imports: [SharedModule],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  protected readonly product = signal<Product | null>(null);
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.loadProduct(params['product_id']);
    });
  }

  protected navigateBack(): void {
    this.location.back();
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
}
