import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, Field, required, email } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UserRole } from '@core/interfaces/admin/users.interface';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
}

@Component({
  selector: 'app-admin-user-form',
  imports: [SharedModule, InputComponent, Field, DropdownComponent],
  templateUrl: './admin-user-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly isSubmitting = signal<boolean>(false);

  readonly roleOptions: ComboboxItems[] = [
    { label: 'მომხმარებელი', value: 'user' },
    { label: 'ადმინი', value: 'admin' },
  ];

  readonly userId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly userModel = signal<UserFormData>({
    name: '',
    email: '',
    role: 'user',
  });

  readonly userForm = form(this.userModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.email, { message: 'ელ-ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'ვალიდური ელ-ფოსტა აუცილებელია' });
    required(fieldPath.role, { message: 'როლი აუცილებელია' });
  });

  readonly user = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) =>
        id
          ? this.adminService.searchUsers(`id=${id}`).pipe(
              catchError(() => {
                this.toastService.add('შეცდომა', 'მომხმარებელი ვერ მოიძებნა', 3000, 'error');
                this.router.navigate(['/admin/users']);
                return of(null);
              }),
            )
          : of(null),
      ),
    ),
  );

  constructor() {
    effect(() => {
      const response = this.user();
      if (response?.users.length) {
        const user = response.users[0];
        this.userModel.set({
          name: user.name,
          email: user.email,
          role: user.role,
        });
      }
    });
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const payload = {
      name: this.userModel().name,
      email: this.userModel().email,
      role: this.userModel().role,
    };

    const userId = this.userId();
    if (!userId) return;

    this.adminService
      .updateUser(userId, payload)
      .pipe(
        tap(() => {
          this.toastService.add(
            'წარმატება',
            'მომხმარებელი წარმატებით განახლდა',
            3000,
            'success',
          );
          this.router.navigate(['/admin/users']);
        }),
        catchError((error) => {
          this.toastService.add('შეცდომა', error.error.message, 3000, 'error');
          return of(null);
        }),
      )
      .subscribe(() => {
        this.isSubmitting.set(false);
      });
  }

  onRoleChange(value: string | undefined): void {
    if (value) {
      this.userModel.update((model) => ({ ...model, role: value as UserRole }));
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
}
