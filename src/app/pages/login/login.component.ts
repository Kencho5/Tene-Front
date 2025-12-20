import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AuthTitleService } from '@core/services/auth/auth-title.service';
import { InputComponent } from '@shared/components/ui/input/input.component';
import {
  form,
  Field,
  required,
  email,
  minLength,
  submit,
} from '@angular/forms/signals';
import { AuthService } from '@core/services/auth/auth-service.service';
import { GoogleAuthService } from '@core/services/auth/google-auth-service.service';
import { ToastService } from '@core/services/toast.service';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginFields } from '@core/interfaces/auth.interface';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-login',
  imports: [SharedModule, InputComponent, Field],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly authTitleService = inject(AuthTitleService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);

  readonly loginModel = signal<LoginFields>({
    email: '',
    password: '',
  });

  readonly loginForm = form(this.loginModel, (fieldPath) => {
    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.password, { message: 'პაროლი აუცილებელია' });
    minLength(fieldPath.password, 4, {
      message: 'პაროლი უნდა შედგებოდეს მინიმუმ 4 სიმბოლოსგან',
    });
  });

  readonly errorMessage = computed(() => {
    const allErrors = this.loginForm().errorSummary();
    return allErrors.length > 0
      ? allErrors[0].message || 'გთხოვთ შეავსოთ ყველა ველი'
      : '';
  });

  constructor() {
    this.authTitleService.setTitle('ავტორიზაცია');
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    submit(this.loginForm, async () => {
      this.isLoading.set(true);
      const userData: LoginFields = this.loginModel();

      this.authService
        .login(userData)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.authService.setAuth(response.token);
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.toastService.add(
              'ავტორიზაცია ვერ მოხერხდა',
              errorResponse.error.error ||
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
          'Google-ით შესვლა ვერ მოხერხდა',
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
