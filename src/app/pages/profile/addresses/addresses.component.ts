import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AddressService } from '@core/services/address.service';
import { ToastService } from '@core/services/toast.service';
import { AddressData } from '@core/interfaces/address.interface';
import { SharedModule } from '@shared/shared.module';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { AddressFormModalComponent } from '@shared/components/address-form-modal/address-form-modal.component';
import { georgianCities } from '@shared/components/address-form-modal/georgian-cities';
import { TBILISI_REGIONS } from '@pages/checkout/checkout.config';

@Component({
  selector: 'app-addresses',
  imports: [
    SharedModule,
    SpinnerComponent,
    ConfirmationModalComponent,
    AddressFormModalComponent,
  ],
  templateUrl: './addresses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1' },
})
export class AddressesComponent {
  private readonly addressService = inject(AddressService);
  private readonly toastService = inject(ToastService);

  readonly addresses = rxResource({
    defaultValue: [] as AddressData[],
    stream: () => this.addressService.getAddresses(),
  });

  cityLabel(value: string): string {
    return georgianCities.find((c) => c.value === value)?.label ?? value;
  }

  regionLabel(value: string): string {
    return TBILISI_REGIONS.find((r) => r.value === value)?.label ?? value;
  }

  readonly isDeleteModalOpen = signal(false);
  readonly deletingAddress = signal<AddressData | null>(null);

  onAddressSaved() {
    this.addresses.reload();
  }

  openDeleteModal(address: AddressData) {
    this.deletingAddress.set(address);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deletingAddress.set(null);
  }

  confirmDelete() {
    const address = this.deletingAddress();
    if (!address?.id) return;

    this.addressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.toastService.add(
          'წარმატებული',
          'მისამართი წარმატებით წაიშალა',
          3000,
          'success',
        );
        this.closeDeleteModal();
        this.addresses.reload();
      },
      error: () => {
        this.toastService.add(
          'შეცდომა',
          'მისამართის წაშლა ვერ მოხერხდა',
          5000,
          'error',
        );
        this.closeDeleteModal();
      },
    });
  }
}
