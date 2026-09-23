import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { form, required, validate } from '@angular/forms/signals';
import { PhoneNumberService } from '@core/services/phone-number.service';
import { ToastService } from '@core/services/toast.service';
import { PhoneNumber } from '@core/interfaces/phone-number.interface';
import { SharedModule } from '@shared/shared.module';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { PhoneVerificationComponent } from '@shared/components/phone-verification/phone-verification.component';
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from '@utils/phone-number';

@Component({
  selector: 'app-phone-numbers',
  imports: [
    SharedModule,
    SpinnerComponent,
    ConfirmationModalComponent,
    InputComponent,
    PhoneVerificationComponent,
  ],
  templateUrl: './phone-numbers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1' },
})
export class PhoneNumbersComponent {
  private readonly phoneNumberService = inject(PhoneNumberService);
  private readonly toastService = inject(ToastService);

  readonly formatPhoneNumber = formatPhoneNumber;

  readonly phoneNumbers = rxResource({
    defaultValue: [] as PhoneNumber[],
    stream: () => this.phoneNumberService.getPhoneNumbers(),
  });

  readonly isAdding = signal(false);
  readonly editingPhone = signal<PhoneNumber | null>(null);
  readonly formSubmitted = signal(false);
  readonly saving = signal(false);

  readonly phoneModel = signal({ phone_number: '' });
  readonly phoneForm = form(this.phoneModel, (fieldPath) => {
    required(fieldPath.phone_number, { message: 'ტელეფონის ნომერი აუცილებელია' });
    validate(fieldPath.phone_number, ({ value }) =>
      !value() || isValidPhoneNumber(value())
        ? undefined
        : { kind: 'phone', message: 'შეიყვანეთ სწორი მობილურის ნომერი (5XXXXXXXX)' },
    );
  });

  readonly verifyingPhone = signal<PhoneNumber | null>(null);
  readonly verificationCode = signal('');
  readonly verificationCodeSent = signal(false);
  readonly verificationSubmitted = signal(false);
  readonly verifying = signal(false);
  readonly verificationCodeInvalid = computed(
    () => this.verificationSubmitted() && this.verificationCode().length !== 6,
  );

  readonly isDeleteModalOpen = signal(false);
  readonly deletingPhone = signal<PhoneNumber | null>(null);

  constructor() {
    effect(() => {
      if (this.verificationCode().length === 6) untracked(() => this.confirmVerify());
    });
  }

  openForCreate() {
    this.editingPhone.set(null);
    this.verifyingPhone.set(null);
    this.phoneModel.set({ phone_number: '' });
    this.phoneForm().reset();
    this.formSubmitted.set(false);
    this.isAdding.set(true);
  }

  cancelAdd() {
    this.isAdding.set(false);
  }

  openForEdit(phone: PhoneNumber) {
    this.editingPhone.set(phone);
    this.isAdding.set(false);
    this.verifyingPhone.set(null);
    this.phoneModel.set({ phone_number: formatPhoneNumber(phone.phone_number) });
    this.formSubmitted.set(false);
  }

  cancelEdit() {
    this.editingPhone.set(null);
  }

  savePhone() {
    this.formSubmitted.set(true);
    if (this.phoneForm().invalid() || this.saving()) return;

    const normalized = normalizePhoneNumber(this.phoneModel().phone_number);
    if (!normalized) return;

    const editing = this.editingPhone();
    const request = editing
      ? this.phoneNumberService.updatePhoneNumber(editing.id, normalized)
      : this.phoneNumberService.addPhoneNumber(normalized);

    this.saving.set(true);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.isAdding.set(false);
        this.editingPhone.set(null);
        this.phoneNumbers.reload();
        this.toastService.add('წარმატებული', 'ნომერი შენახულია', 3000, 'success');
        if (!saved.verified) this.openVerify(saved);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const message = error?.error?.message || 'ნომრის შენახვა ვერ მოხერხდა';
        this.toastService.add('შეცდომა', message, 5000, 'error');
      },
    });
  }

  openVerify(phone: PhoneNumber) {
    this.isAdding.set(false);
    this.editingPhone.set(null);
    this.verificationCode.set('');
    this.verificationCodeSent.set(false);
    this.verificationSubmitted.set(false);
    this.verifyingPhone.set(phone);
  }

  closeVerify() {
    this.verifyingPhone.set(null);
  }

  confirmVerify() {
    const phone = this.verifyingPhone();
    if (!phone || this.verifying()) return;
    this.verificationSubmitted.set(true);
    if (this.verificationCode().length !== 6) return;

    this.verifying.set(true);
    this.phoneNumberService
      .verifyPhoneNumber(phone.phone_number, Number(this.verificationCode()))
      .subscribe({
        next: () => {
          this.verifying.set(false);
          this.closeVerify();
          this.phoneNumbers.reload();
          this.toastService.add('წარმატებული', 'ნომერი დადასტურდა', 3000, 'success');
        },
        error: (error: HttpErrorResponse) => {
          this.verifying.set(false);
          this.verificationCode.set('');
          if (error.status === 429) this.verificationCodeSent.set(false);
          const message = error?.error?.message || 'ნომრის დადასტურება ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
        },
      });
  }

  openDeleteModal(phone: PhoneNumber) {
    this.deletingPhone.set(phone);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deletingPhone.set(null);
  }

  confirmDelete() {
    const phone = this.deletingPhone();
    if (!phone) return;

    this.phoneNumberService.deletePhoneNumber(phone.id).subscribe({
      next: () => {
        this.toastService.add('წარმატებული', 'ნომერი წაიშალა', 3000, 'success');
        this.closeDeleteModal();
        this.phoneNumbers.reload();
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message || 'ნომრის წაშლა ვერ მოხერხდა';
        this.toastService.add('შეცდომა', message, 5000, 'error');
        this.closeDeleteModal();
      },
    });
  }
}
