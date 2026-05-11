import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, of } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CableType } from '@core/interfaces/admin/cable-types.interface';

interface CableTypeFormData {
  name: string;
}

@Component({
  selector: 'app-admin-cable-type-form',
  imports: [SharedModule, InputComponent, FormField],
  templateUrl: './admin-cable-type-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCableTypeFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);

  readonly typeId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.typeId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'კაბელის ტიპის რედაქტირება' : 'ახალი კაბელის ტიპი',
  );

  readonly typeModel = signal<CableTypeFormData>({ name: '' });

  readonly typeForm = form(this.typeModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
  });

  readonly allTypes = toSignal(this.adminService.getCableTypes().pipe(catchError(() => of([]))), {
    initialValue: [] as CableType[],
  });

  readonly cableType = computed(() => {
    const id = this.typeId();
    if (!id) return null;
    return this.allTypes().find((t) => t.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      const data = this.cableType();
      if (this.isEditMode() && data) {
        this.typeModel.set({ name: data.name });
      }
    });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.typeForm().invalid()) {
      const errors = this.typeForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';
      this.toastService.add('ტიპის შენახვა ვერ მოხერხდა', errorMessage, 5000, 'error');
      return;
    }

    this.isLoading.set(true);

    const payload = { name: this.typeForm.name().value() };
    const request = this.isEditMode()
      ? this.adminService.updateCableType(this.typeId()!, payload)
      : this.adminService.createCableType(payload);

    request
      .pipe(
        catchError((error) => {
          this.isLoading.set(false);
          let message = 'ტიპის შენახვა ვერ მოხერხდა';
          if (error.status === 409) message = 'ამ სახელით ტიპი უკვე არსებობს';
          else if (error.status === 404) message = 'ტიპი ვერ მოიძებნა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.isLoading.set(false);
          this.toastService.add(
            'წარმატებული',
            this.isEditMode() ? 'ტიპი განახლდა' : 'ტიპი დაემატა',
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
