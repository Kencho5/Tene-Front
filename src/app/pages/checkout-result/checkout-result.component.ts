import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Order } from '@core/interfaces/products.interface';
import { OrderService } from '@core/services/order.service';
import { CartService } from '@core/services/products/cart.service';
import { SharedModule } from '@shared/shared.module';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-checkout-result',
  imports: [SharedModule, BreadcrumbComponent],
  templateUrl: './checkout-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutResultComponent {
  private readonly orderService = inject(OrderService);
  private readonly cartService = inject(CartService);

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
    { label: 'შეკვეთის შედეგი', route: '/checkout/result' },
  ];

  readonly loading = signal(true);
  readonly latestOrder = signal<Order | null>(null);
  readonly error = signal(false);

  readonly statusText = computed(() => {
    switch (this.latestOrder()?.status) {
      case 'approved':
        return 'გადახდა წარმატებულია';
      case 'pending':
      case 'processing':
        return 'გადახდა მუშავდება';
      case 'declined':
        return 'გადახდა უარყოფილია';
      case 'expired':
        return 'გადახდის ვადა ამოიწურა';
      default:
        return 'შეკვეთის სტატუსი';
    }
  });

  readonly statusColor = computed(() => {
    switch (this.latestOrder()?.status) {
      case 'approved':
        return 'text-green-60';
      case 'declined':
      case 'expired':
        return 'text-valencia-50';
      default:
        return 'text-platinum-70';
    }
  });

  readonly isSuccess = computed(
    () => this.latestOrder()?.status === 'approved',
  );

  readonly isFailed = computed(() => {
    const status = this.latestOrder()?.status;
    return status === 'declined' || status === 'expired';
  });

  constructor() {
    this.orderService
      .getOrders()
      .pipe(
        takeUntilDestroyed(),
        catchError(() => {
          this.error.set(true);
          this.loading.set(false);
          return of([]);
        }),
      )
      .subscribe((orders) => {
        if (orders.length > 0) {
          const order = orders[0];
          this.latestOrder.set(order);
          if (order.status === 'approved') {
            this.cartService.clearCart();
          }
        }
        this.loading.set(false);
      });
  }

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }
}
