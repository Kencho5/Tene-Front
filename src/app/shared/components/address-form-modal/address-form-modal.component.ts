import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  signal,
} from '@angular/core';
import { form, required, Field } from '@angular/forms/signals';
import { AddressData } from '@core/interfaces/address.interface';
import { AddressService } from '@core/services/address.service';
import { ToastService } from '@core/services/toast.service';
import { storeCities } from '@utils/store-cities';
import { ModalComponent } from '@shared/components/ui/modal/modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';

@Component({
  selector: 'app-address-form-modal',
  imports: [ModalComponent, InputComponent, ComboboxComponent, Field],
  templateUrl: './address-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormModalComponent {
  private readonly addressService = inject(AddressService);
  private readonly toastService = inject(ToastService);

  readonly storeCities = storeCities;

  readonly isOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly editingAddressId = signal<number | null>(null);

  readonly addressSaved = output<AddressData>();

  readonly addressModel = signal<AddressData>({
    city: '',
    address: '',
    details: '',
  });

  readonly addressForm = form(this.addressModel, (fieldPath) => {
    required(fieldPath.city, { message: 'ქალაქი აუცილებელია' });
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });
  });

  openForCreate() {
    this.isEditMode.set(false);
    this.editingAddressId.set(null);
    this.addressForm().reset();
    this.isOpen.set(true);
  }

  openForEdit(address: AddressData) {
    this.addressModel.set(address);
    this.isEditMode.set(true);
    this.editingAddressId.set(address.id ?? null);
    this.isOpen.set(true);
  }

  handleSubmit() {
    if (this.addressForm().invalid()) {
      const errors = this.addressForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'მისამართის დამატება ვერ მოხერხდა',
        errorMessage,
        5000,
        'error',
      );
      return;
    }

    const addressData = this.addressForm().value();

    if (this.isEditMode()) {
      const addressId = this.editingAddressId();
      if (!addressId) return;

      this.addressService.updateAddress(addressId, addressData).subscribe({
        next: (updatedAddress) => {
          this.toastService.add(
            'წარმატებული',
            'მისამართი განახლდა',
            3000,
            'success',
          );
          this.addressSaved.emit(updatedAddress);
          this.close();
        },
        error: () => {
          this.toastService.add(
            'შეცდომა',
            'მისამართის განახლება ვერ მოხერხდა',
            5000,
            'error',
          );
        },
      });
    } else {
      this.addressService.addAddress(addressData).subscribe({
        next: (newAddress) => {
          this.toastService.add(
            'წარმატებული',
            'მისამართი წარმატებით დაემატა',
            3000,
            'success',
          );
          this.addressSaved.emit(newAddress);
          this.close();
        },
        error: () => {
          this.toastService.add(
            'შეცდომა',
            'მისამართის დამატება ვერ მოხერხდა',
            5000,
            'error',
          );
        },
      });
    }
  }

  close() {
    this.isOpen.set(false);
    this.isEditMode.set(false);
    this.editingAddressId.set(null);
    this.addressForm().reset();
  }
}
