import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { AdminService } from '@core/services/admin/admin.service';
import { ProductsService } from '@core/services/products/products.service';
import { ToastService } from '@core/services/toast.service';
import { ComboOffer, ComboProduct } from '@core/interfaces/combo-offers.interface';
import { ComboOfferFormComponent } from '@shared/components/admin/combo-offer-form/combo-offer-form.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { calculateDiscount } from '@utils/discountedPrice';
import { getProductImageUrl } from '@utils/product-image-url';

@Component({
  selector: 'app-combo-offers-manager',
  imports: [SharedModule, ComboOfferFormComponent, ConfirmationModalComponent],
  templateUrl: './combo-offers-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboOffersManagerComponent {
  private readonly adminService = inject(AdminService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);

  readonly mainProductId = input<string | null>(null);

  readonly editing = signal<ComboOffer | 'new' | null>(null);
  readonly pendingDelete = signal<ComboOffer | null>(null);
  readonly togglingIds = signal<Set<number>>(new Set());
  readonly filter = signal('');

  readonly offersResource = rxResource({
    defaultValue: [] as ComboOffer[],
    params: () => ({ id: this.mainProductId() }),
    stream: ({ params }) =>
      this.adminService
        .getComboOffers(params.id ?? undefined)
        .pipe(catchError(() => of([] as ComboOffer[]))),
  });

  readonly mainProductResource = rxResource({
    defaultValue: null as ComboProduct | null,
    params: () => this.mainProductId(),
    stream: ({ params: id }) => {
      if (!id) return of(null as ComboProduct | null);
      return this.productsService.getProduct(id).pipe(
        map((p) => ({ data: p.data, images: p.images }) as ComboProduct),
        catchError(() => of(null as ComboProduct | null)),
      );
    },
  });

  readonly offers = computed(() => {
    const term = this.filter().trim().toLowerCase();
    const all = this.offersResource.value();
    if (!term) return all;
    return all.filter(
      (o) =>
        o.title.toLowerCase().includes(term) ||
        o.main_product?.data.name.toLowerCase().includes(term) ||
        o.main_product?.data.sku?.toLowerCase().includes(term) ||
        o.items.some((i) => i.product?.data.name.toLowerCase().includes(term)),
    );
  });

  readonly editingOffer = computed(() => {
    const e = this.editing();
    return e === 'new' ? null : e;
  });

  readonly deleteMessage = computed(() => {
    const offer = this.pendingDelete();
    return offer ? `ნამდვილად გსურთ კომბოს „${offer.title}“ წაშლა?` : '';
  });

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  imageUrl(product: ComboProduct | null): string {
    if (!product) return '';
    const img = product.images.find((i) => i.is_primary) ?? product.images[0];
    return img ? getProductImageUrl(product.data.id, img.image_uuid, img.extension) : '';
  }

  regularPrice(product: ComboProduct | null): number {
    return product ? calculateDiscount(product.data) : 0;
  }

  num(value: string | number | null): number {
    return Number(value ?? 0);
  }

  regularTotal(offer: ComboOffer): number {
    return (
      this.regularPrice(offer.main_product) +
      offer.items.reduce((sum, i) => sum + this.regularPrice(i.product), 0)
    );
  }

  startCreate(): void {
    this.editing.set('new');
  }

  startEdit(offer: ComboOffer): void {
    this.editing.set(offer);
  }

  closeForm(): void {
    this.editing.set(null);
  }

  onSaved(offer: ComboOffer): void {
    const wasNew = this.editing() === 'new';
    this.editing.set(null);
    this.toastService.add(
      'წარმატება',
      wasNew ? `კომბო „${offer.title}“ შეიქმნა` : `კომბო „${offer.title}“ განახლდა`,
      3000,
      'success',
    );
    this.offersResource.reload();
  }

  toggle(offer: ComboOffer): void {
    if (this.togglingIds().has(offer.id)) return;
    this.togglingIds.update((s) => new Set(s).add(offer.id));
    this.adminService.setComboOfferEnabled(offer.id, !offer.enabled).subscribe({
      next: (updated) => {
        this.offersResource.update((list) =>
          list.map((o) => (o.id === updated.id ? updated : o)),
        );
        this.clearToggling(offer.id);
      },
      error: (err) => {
        this.clearToggling(offer.id);
        this.toastService.add('შეცდომა', err?.error?.message || 'სტატუსის შეცვლა ვერ მოხერხდა', 4000, 'error');
      },
    });
  }

  askDelete(offer: ComboOffer): void {
    this.pendingDelete.set(offer);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const offer = this.pendingDelete();
    if (!offer) return;
    this.pendingDelete.set(null);
    this.adminService.deleteComboOffer(offer.id).subscribe({
      next: () => {
        this.offersResource.update((list) => list.filter((o) => o.id !== offer.id));
        if (this.editingOffer()?.id === offer.id) this.editing.set(null);
        this.toastService.add('წარმატება', 'კომბო წაიშალა', 3000, 'success');
      },
      error: (err) =>
        this.toastService.add('შეცდომა', err?.error?.message || 'წაშლა ვერ მოხერხდა', 4000, 'error'),
    });
  }

  private clearToggling(id: number): void {
    this.togglingIds.update((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }
}
