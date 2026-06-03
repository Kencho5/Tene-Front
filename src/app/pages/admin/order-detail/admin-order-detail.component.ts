import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, OrderCommentImage, OrderItem } from '@core/interfaces/products.interface';
import {
  LightboxComponent,
  LightboxImage,
} from '@shared/components/ui/lightbox/lightbox.component';
import { SharedModule } from '@shared/shared.module';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateProductSlug } from '@utils/slug';
import { AdminService } from '@core/services/admin/admin.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-admin-order-detail',
  imports: [SharedModule, LightboxComponent],
  templateUrl: './admin-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  readonly orderId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  readonly orderResource = rxResource({
    params: () => this.orderId(),
    stream: ({ params }) =>
      this.adminService
        .searchOrders(`id=${params}`)
        .pipe(map((res): Order | undefined => res.orders[0])),
  });

  readonly order = computed(() => this.orderResource.value());

  readonly subtotal = computed(() => {
    const order = this.order();
    if (!order) return 0;
    return order.items.reduce(
      (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
      0,
    );
  });

  readonly lightboxOpen = signal(false);
  readonly lightboxImages = signal<LightboxImage[]>([]);
  readonly lightboxActiveId = signal<string | null>(null);

  goBack(): void {
    this.router.navigate(['/admin/orders']);
  }

  getItemImageUrl(item: OrderItem): string | null {
    if (!item.product_image) return null;
    return getProductImageUrl(
      item.product_id,
      item.product_image.image_uuid,
      item.product_image.extension,
    );
  }

  getProductRoute(item: OrderItem): string {
    return `/products/${generateProductSlug(item.product_name)}/${item.product_id}`;
  }

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  formatItemAmount(amount: number | string): string {
    return Number(amount).toFixed(2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ka-GE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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

  openCommentImages(images: OrderCommentImage[], activeId: string): void {
    this.lightboxImages.set(
      images.map((image) => ({
        id: image.image_uuid,
        src: image.url,
        alt: 'კომენტარის სურათი',
      })),
    );
    this.lightboxActiveId.set(activeId);
    this.lightboxOpen.set(true);
  }

  closeCommentImages(): void {
    this.lightboxOpen.set(false);
  }

  onCommentImageChange(imageId: string): void {
    this.lightboxActiveId.set(imageId);
  }
}
