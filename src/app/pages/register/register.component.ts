import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  email,
  minLength,
  submit,
} from '@angular/forms/signals';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthTitleService } from '@core/services/auth/auth-title.service';
import { AuthService } from '@core/services/auth/auth-service.service';
import { ToastService } from '@core/services/toast.service';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { RegisterFields } from '@core/interfaces/auth.interface';
import { SharedModule } from '@shared/shared.module';
import { GoogleAuthService } from '@core/services/auth/google-auth-service.service';

@Component({
  selector: 'app-register',
  imports: [SharedModule, InputComponent, FormField],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly authTitleService = inject(AuthTitleService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);

  readonly registerModel = signal<RegisterFields>({
    name: '',
    email: '',
    password: '',
  });

  readonly registerForm = form(this.registerModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.password, { message: 'პაროლი აუცილებელია' });
    minLength(fieldPath.password, 4, {
      message: 'პაროლი უნდა შედგებოდეს მინიმუმ 4 სიმბოლოსგან',
    });
  });

  readonly errorMessage = computed(() => {
    const allErrors = this.registerForm().errorSummary();
    return allErrors.length > 0
      ? allErrors[0].message || 'გთხოვთ შეავსოთ ყველა ველი'
      : '';
  });

  constructor() {
    this.authTitleService.setTitle('რეგისტრაცია');
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    submit(this.registerForm, async () => {
      this.isLoading.set(true);
      const userData: RegisterFields = this.registerModel();

      this.authService
        .register(userData)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.authService.setAuth(response.token);
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.toastService.add(
              'რეგისტრაცია ვერ მოხერხდა',
              errorResponse.error.message ||
                'გთხოვთ შეამოწმოთ თქვენი მონაცემები და სცადოთ თავიდან.',
              4000,
              'error',
            );
          },
        });
    });
  }

  authorizeWithGoogle(): void {
    this.isGoogleLoading.set(true);

    this.googleAuthService
      .init()
      .catch((_) => {
        this.toastService.add(
          'Google-ით რეგისტრაცია ვერ მოხერხდა',
          'გთხოვთ სცადოთ თავიდან',
          4000,
          'error',
        );
      })
      .finally(() => {
        this.isGoogleLoading.set(false);
      });
  }
}
