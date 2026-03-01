import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Order, OrderItem } from '@core/interfaces/products.interface';
import { OrderService } from '@core/services/order.service';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateProductSlug } from '@utils/slug';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-orders',
  imports: [SharedModule],
  templateUrl: './orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-full' },
})
export class OrdersComponent {
  private readonly orderService = inject(OrderService);

  readonly orders = rxResource({
    defaultValue: [] as Order[],
    stream: () => this.orderService.getOrders(),
  });

  readonly totalOrders = computed(() => this.orders.value().length);

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusLabel(status: Order['status']): string {
    switch (status) {
      case 'approved':
        return 'დადასტურებული';
      case 'pending':
        return 'მოლოდინში';
      case 'processing':
        return 'მუშავდება';
      case 'declined':
        return 'უარყოფილი';
      case 'expired':
        return 'ვადაგასული';
    }
  }

  getProductRoute(item: OrderItem): string {
    return `/products/${generateProductSlug(item.product_name)}/${item.product_id}`;
  }

  getItemImageUrl(item: OrderItem): string | null {
    if (!item.product_image) return null;
    return getProductImageUrl(
      item.product_id,
      item.product_image.image_uuid,
      item.product_image.extension,
    );
  }
}
