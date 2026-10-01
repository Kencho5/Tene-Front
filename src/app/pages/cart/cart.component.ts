import {
  Component,
  inject,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '@core/services/products/cart.service';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { CartItemComponent } from '@shared/components/cart-item/cart-item.component';
import { PriceSummaryComponent } from '@shared/components/price-summary/price-summary.component';

@Component({
  selector: 'app-cart',
  imports: [
    SharedModule,
    ImageComponent,
    ConfirmationModalComponent,
    CartItemComponent,
    PriceSummaryComponent,
  ],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly showCableErrors = signal(false);

  handleCheckout(): void {
    if (this.cartService.hasUnconfiguredCables()) {
      this.showCableErrors.set(true);
      afterNextRender(
        () => {
          this.elementRef.nativeElement
            .querySelector('.border-valencia-60')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        { injector: this.injector },
      );
      return;
    }
    this.router.navigate(['/checkout']);
  }
}
