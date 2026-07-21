import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { catchError, of } from 'rxjs';
import {
  PaymentLinkFields,
  PaymentLinkRequest,
} from '@core/interfaces/admin/payment-link.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-admin-payment-link',
  imports: [SharedModule, InputComponent, FormField],
  templateUrl: './admin-payment-link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentLinkComponent {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  private readonly defaultModel: PaymentLinkFields = {
    price: '',
    email: '',
    phone_number: '',
    address: '',
    comment: '',
  };

  readonly paymentLinkModel = signal<PaymentLinkFields>(structuredClone(this.defaultModel));

  readonly paymentLinkForm = form(this.paymentLinkModel);

  // Result
  readonly isLoading = signal(false);
  readonly checkoutUrl = signal<string | null>(null);
  readonly orderId = signal<string | null>(null);
  readonly copied = signal(false);

  onSubmit(event?: Event): void {
    event?.preventDefault();

    submit(this.paymentLinkForm, async () => {
      this.dispatch();
      return [];
    });
  }

  private dispatch(): void {
    const model = this.paymentLinkModel();

    const payload: PaymentLinkRequest = {
      price: model.price.trim() || null,
      email: model.email.trim() || null,
      phone_number: model.phone_number.trim() || null,
      address: model.address.trim() || null,
      comment: model.comment.trim() || null,
    };

    this.isLoading.set(true);
    this.checkoutUrl.set(null);

    this.adminService
      .createPaymentLink(payload)
      .pipe(
        catchError((err) => {
          this.isLoading.set(false);
          const message = err?.error?.message || 'გადახდის ბმულის შექმნა ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.isLoading.set(false);
        if (response) {
          this.orderId.set(response.order_id);
          this.checkoutUrl.set(response.checkout_url);
          this.toastService.add('წარმატებული', 'გადახდის ბმული შეიქმნა', 3000, 'success');
        }
      });
  }

  copyLink(): void {
    const url = this.checkoutUrl();
    if (!url || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  reset(): void {
    this.checkoutUrl.set(null);
    this.orderId.set(null);
    this.paymentLinkModel.set(structuredClone(this.defaultModel));
  }
}
