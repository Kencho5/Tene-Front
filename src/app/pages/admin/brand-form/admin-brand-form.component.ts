import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, Field, required } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, of } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toSignal } from '@angular/core/rxjs-interop';

interface BrandFormData {
  name: string;
}

@Component({
  selector: 'app-admin-brand-form',
  imports: [SharedModule, InputComponent, Field],
  templateUrl: './admin-brand-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrandFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);

  readonly brandId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.brandId() !== null);
  readonly pageTitle = computed(() => (this.isEditMode() ? 'ბრენდის რედაქტირება' : 'ახალი ბრენდი'));

  readonly brandModel = signal<BrandFormData>({
    name: '',
  });

  readonly brandForm = form(this.brandModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
  });

  readonly allBrands = toSignal(this.adminService.getBrands().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  readonly brand = computed(() => {
    const id = this.brandId();
    if (!id) return null;
    return this.allBrands().find((b) => b.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      const brandData = this.brand();
      if (this.isEditMode() && brandData) {
        this.brandModel.set({ name: brandData.name });
      }
    });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.brandForm().invalid()) {
      const errors = this.brandForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add('ბრენდის დამატება ვერ მოხერხდა', errorMessage, 5000, 'error');
      return;
    }

    this.isLoading.set(true);

    const payload = { name: this.brandForm.name().value() };
    const request = this.isEditMode()
      ? this.adminService.updateBrand(this.brandId()!, payload)
      : this.adminService.createBrand(payload);

    request
      .pipe(
        catchError((error) => {
          this.isLoading.set(false);
          const message =
            error.status === 409
              ? 'ბრენდი ამ სახელით უკვე არსებობს'
              : 'ბრენდის შენახვა ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.isLoading.set(false);
          this.toastService.add(
            'წარმატებული',
            this.isEditMode() ? 'ბრენდი წარმატებით განახლდა' : 'ბრენდი წარმატებით დაემატა',
            3000,
            'success',
          );
          this.router.navigate(['/admin/brands']);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/brands']);
  }
}
