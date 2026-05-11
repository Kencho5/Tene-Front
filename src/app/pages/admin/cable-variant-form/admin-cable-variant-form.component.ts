import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required, min } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, of } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CableType,
  CableVariantRequest,
} from '@core/interfaces/admin/cable-types.interface';

interface CableVariantFormData {
  watts: number | null;
  length_cm: number | null;
  price: string;
  warranty_months: number | null;
}

@Component({
  selector: 'app-admin-cable-variant-form',
  imports: [SharedModule, InputComponent, FormField],
  templateUrl: './admin-cable-variant-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCableVariantFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);

  readonly typeId = computed(() => {
    const id = this.route.snapshot.paramMap.get('typeId');
    return id ? Number(id) : null;
  });

  readonly variantId = computed(() => {
    const id = this.route.snapshot.paramMap.get('variantId');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.variantId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'ვარიანტის რედაქტირება' : 'ახალი ვარიანტი',
  );

  readonly variantModel = signal<CableVariantFormData>({
    watts: null,
    length_cm: null,
    price: '',
    warranty_months: null,
  });

  readonly variantForm = form(this.variantModel, (fieldPath) => {
    required(fieldPath.price, { message: 'ფასი აუცილებელია' });
    required(fieldPath.watts, { message: 'სიმძლავრე აუცილებელია' });
    required(fieldPath.length_cm, { message: 'სიგრძე აუცილებელია' });
    required(fieldPath.warranty_months, { message: 'გარანტია აუცილებელია' });
    min(fieldPath.watts, 1, { message: 'სიმძლავრე უნდა იყოს დადებითი' });
    min(fieldPath.length_cm, 1, { message: 'სიგრძე უნდა იყოს დადებითი' });
    min(fieldPath.warranty_months, 0, { message: 'გარანტია არ შეიძლება იყოს უარყოფითი' });
  });

  readonly allTypes = toSignal(this.adminService.getCableTypes().pipe(catchError(() => of([]))), {
    initialValue: [] as CableType[],
  });

  readonly cableType = computed(() => {
    const id = this.typeId();
    if (!id) return null;
    return this.allTypes().find((t) => t.id === id) ?? null;
  });

  readonly variant = computed(() => {
    const type = this.cableType();
    const vId = this.variantId();
    if (!type || !vId) return null;
    return type.variants.find((v) => v.id === vId) ?? null;
  });

  constructor() {
    effect(() => {
      const data = this.variant();
      if (this.isEditMode() && data) {
        this.variantModel.set({
          watts: data.watts,
          length_cm: data.length_cm,
          price: data.price,
          warranty_months: data.warranty_months,
        });
      }
    });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    const typeId = this.typeId();
    if (!typeId) {
      this.toastService.add('შეცდომა', 'ტიპის ID აკლია', 5000, 'error');
      return;
    }

    if (this.variantForm().invalid()) {
      const errors = this.variantForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';
      this.toastService.add('ვარიანტის შენახვა ვერ მოხერხდა', errorMessage, 5000, 'error');
      return;
    }

    this.isLoading.set(true);

    const value = this.variantForm().value();
    const payload: CableVariantRequest = {
      watts: Number(value.watts),
      length_cm: Number(value.length_cm),
      price: String(value.price),
      warranty_months: Number(value.warranty_months),
    };

    const request = this.isEditMode()
      ? this.adminService.updateCableVariant(typeId, this.variantId()!, payload)
      : this.adminService.createCableVariant(typeId, payload);

    request
      .pipe(
        catchError((error) => {
          this.isLoading.set(false);
          let message = 'ვარიანტის შენახვა ვერ მოხერხდა';
          if (error.status === 409) message = 'ვარიანტი ამ პარამეტრებით უკვე არსებობს';
          else if (error.status === 400) message = error.error?.message || 'არასწორი მონაცემები';
          else if (error.status === 404) message = 'ვარიანტი ვერ მოიძებნა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.isLoading.set(false);
          this.toastService.add(
            'წარმატებული',
            this.isEditMode() ? 'ვარიანტი განახლდა' : 'ვარიანტი დაემატა',
            3000,
            'success',
          );
          this.router.navigate(['/admin/cable-types']);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/cable-types']);
  }
}
