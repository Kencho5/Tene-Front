import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Order } from '@core/interfaces/products.interface';
import { OrderService } from '@core/services/order.service';
import { CartService } from '@core/services/products/cart.service';
import { AuthService } from '@core/services/auth/auth-service.service';
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
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

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
    if (this.authService.isAuthenticated()) {
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
            this.applyOrder(orders[0]);
          }
          this.loading.set(false);
        });
      return;
    }

    const guestOrderId = this.readLatestGuestOrderId();
    if (!guestOrderId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.orderService
      .getOrder(guestOrderId)
      .pipe(
        takeUntilDestroyed(),
        catchError(() => {
          this.error.set(true);
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((order) => {
        if (order) this.applyOrder(order);
        this.loading.set(false);
      });
  }

  private applyOrder(order: Order): void {
    this.latestOrder.set(order);
    if (order.status === 'approved') {
      this.cartService.clearCart();
    }
  }

  private readLatestGuestOrderId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const stored = JSON.parse(localStorage.getItem('guest_orders') ?? '[]');
      return Array.isArray(stored) && stored.length > 0 ? stored[0] : null;
    } catch {
      return null;
    }
  }

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }
}
