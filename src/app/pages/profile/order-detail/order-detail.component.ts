import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderItem } from '@core/interfaces/products.interface';
import { OrderService } from '@core/services/order.service';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateProductSlug } from '@utils/slug';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-order-detail',
  imports: [SharedModule],
  templateUrl: './order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-full' },
})
export class OrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);

  private readonly orderId = computed(() => {
    return this.route.snapshot.paramMap.get('id');
  });

  readonly order = rxResource({
    params: () => ({ id: this.orderId() }),
    stream: ({ params }) => {
      if (!params.id) {
        this.router.navigate(['/profile/orders']);
        return this.orderService.getOrder('');
      }
      return this.orderService.getOrder(params.id);
    },
  });

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  formatItemAmount(amount: number): string {
    return amount.toFixed(2);
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

  statusLabel(status: string): string {
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
      default:
        return status;
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

  customerLabel(type: string): string {
    return type === 'company' ? 'იურიდიული პირი' : 'ფიზიკური პირი';
  }

  deliveryTypeLabel(type: string): string {
    switch (type) {
      case 'delivery':
        return 'მიტანა';
      case 'pickup':
        return 'გატანა';
      default:
        return type;
    }
  }

  deliveryTimeLabel(time: string): string {
    switch (time) {
      case 'same_day':
        return 'იმავე დღეს';
      case 'next_day':
        return 'მეორე დღეს';
      default:
        return time;
    }
  }
}
