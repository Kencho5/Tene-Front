import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { form, required, hidden, FormField } from '@angular/forms/signals';
import { AddressData } from '@core/interfaces/address.interface';
import { AddressService } from '@core/services/address.service';
import { ToastService } from '@core/services/toast.service';
import { georgianCities } from './georgian-cities';
import { TBILISI_REGIONS } from '@pages/checkout/checkout.config';
import { ModalComponent } from '@shared/components/ui/modal/modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';

@Component({
  selector: 'app-address-form-modal',
  imports: [ModalComponent, InputComponent, ComboboxComponent, FormField],
  templateUrl: './address-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormModalComponent {
  private readonly addressService = inject(AddressService);
  private readonly toastService = inject(ToastService);

  readonly georgianCities = georgianCities;
  readonly tbilisiRegions = TBILISI_REGIONS;

  readonly isOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly editingAddressId = signal<number | null>(null);

  readonly addressSaved = output<AddressData>();

  readonly addressModel = signal<AddressData>({
    city: '',
    region: '',
    address: '',
    details: '',
  });

  readonly addressForm = form(this.addressModel, (fieldPath) => {
    required(fieldPath.city, { message: 'ქალაქი აუცილებელია' });
    hidden(fieldPath.region, ({ valueOf }) => valueOf(fieldPath.city) !== 'tbilisi');
    required(fieldPath.region, { message: 'რაიონი აუცილებელია' });
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });
  });

  readonly isTbilisiSelected = computed(
    () => this.addressForm.city().value() === 'tbilisi',
  );

  constructor() {
    effect(() => {
      if (
        this.addressForm.city().value() !== 'tbilisi' &&
        this.addressForm.region().value()
      ) {
        this.addressForm.region().value.set('');
      }
    });
  }

  openForCreate() {
    this.isEditMode.set(false);
    this.editingAddressId.set(null);
    this.addressModel.set({ city: '', region: '', address: '', details: '' });
    this.addressForm().reset();
    this.isOpen.set(true);
  }

  openForEdit(address: AddressData) {
    this.addressModel.set({ ...address, region: address.region ?? '' });
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
