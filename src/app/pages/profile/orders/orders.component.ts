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
    return date.toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  statusClass(status: Order['status']): string {
    switch (status) {
      case 'approved':
        return 'bg-green-10 text-green-70';
      case 'declined':
      case 'expired':
        return 'bg-valencia-10 text-valencia-60';
      default:
        return 'bg-platinum-10 text-platinum-60';
    }
  }

  statusDotClass(status: Order['status']): string {
    switch (status) {
      case 'approved':
        return 'bg-green-60';
      case 'declined':
      case 'expired':
        return 'bg-valencia-50';
      default:
        return 'bg-platinum-40';
    }
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
