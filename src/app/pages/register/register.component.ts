import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  email,
  minLength,
  maxLength,
  pattern,
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

  readonly step = signal<'form' | 'verify'>('form');
  readonly submitted = signal(false);
  readonly verifySubmitted = signal(false);
  readonly isLoading = signal(false);
  readonly isVerifyLoading = signal(false);
  readonly isResending = signal(false);
  readonly isGoogleLoading = signal(false);
  readonly resendCooldown = signal(0);
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly registerModel = signal<RegisterFields>({
    name: '',
    email: '',
    password: '',
  });

  readonly verifyModel = signal<{ code: string }>({ code: '' });

  readonly registerForm = form(this.registerModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.password, { message: 'პაროლი აუცილებელია' });
    minLength(fieldPath.password, 4, {
      message: 'პაროლი უნდა შედგებოდეს მინიმუმ 4 სიმბოლოსგან',
    });
  });

  readonly verifyForm = form(this.verifyModel, (fieldPath) => {
    required(fieldPath.code, { message: 'შეიყვანეთ კოდი' });
    pattern(fieldPath.code, /^\d{6}$/, { message: 'არასწორი კოდი' });
    maxLength(fieldPath.code, 6, { message: 'არასწორი კოდი' });
  });

  readonly errorMessage = computed(() => {
    const allErrors = this.registerForm().errorSummary();
    return allErrors.length > 0
      ? allErrors[0].message || 'გთხოვთ შეავსოთ ყველა ველი'
      : '';
  });

  readonly verifyErrorMessage = computed(() => {
    if (this.verifyServerError()) return this.verifyServerError();
    const allErrors = this.verifyForm().errorSummary();
    return allErrors.length > 0
      ? allErrors[0].message || 'არასწორი კოდი'
      : '';
  });

  readonly verifyServerError = signal('');

  readonly maskedEmail = computed(() => this.registerModel().email);

  constructor() {
    this.authTitleService.setTitle('რეგისტრაცია');
    inject(DestroyRef).onDestroy(() => this.clearResendTimer());
  }

  private startResendCooldown(seconds = 30): void {
    this.clearResendTimer();
    this.resendCooldown.set(seconds);
    this.resendTimer = setInterval(() => {
      const next = this.resendCooldown() - 1;
      if (next <= 0) {
        this.clearResendTimer();
        this.resendCooldown.set(0);
      } else {
        this.resendCooldown.set(next);
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
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
          next: () => {
            this.step.set('verify');
            this.verifyModel.set({ code: '' });
            this.verifySubmitted.set(false);
            this.verifyServerError.set('');
            this.startResendCooldown();
            this.authTitleService.setTitle('კოდის დადასტურება');
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.toastService.add(
              'რეგისტრაცია ვერ მოხერხდა',
              errorResponse.error?.message ||
                'გთხოვთ შეამოწმოთ თქვენი მონაცემები და სცადოთ თავიდან.',
              4000,
              'error',
            );
          },
        });
    });
  }

  onVerifySubmit(event?: Event): void {
    event?.preventDefault();
    this.verifySubmitted.set(true);

    this.verifyServerError.set('');

    submit(this.verifyForm, async () => {
      this.isVerifyLoading.set(true);
      const { name, email, password } = this.registerModel();
      const code = Number(this.verifyModel().code);

      this.authService
        .verifyRegister({ name, email, password, code })
        .pipe(finalize(() => this.isVerifyLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.authService.setAuth(response.token);
          },
          error: (errorResponse: HttpErrorResponse) => {
            const status = errorResponse.status;
            if (status === 401) {
              this.verifyServerError.set('არასწორი ან ვადაგასული კოდი');
            } else {
              this.verifyServerError.set(
                errorResponse.error?.message || 'დადასტურება ვერ მოხერხდა',
              );
            }
          },
        });
    });
  }

  resendCode(): void {
    if (this.isResending() || this.resendCooldown() > 0) return;
    this.isResending.set(true);
    this.authService
      .register(this.registerModel())
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          this.verifyModel.set({ code: '' });
          this.verifySubmitted.set(false);
          this.verifyServerError.set('');
          this.startResendCooldown();
          this.toastService.add(
            'კოდი გამოგზავნილია',
            'შეამოწმეთ ელ. ფოსტა ახალი კოდისთვის.',
            4000,
            'success',
          );
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.toastService.add(
            'კოდის გამოგზავნა ვერ მოხერხდა',
            errorResponse.error?.message || 'გთხოვთ სცადოთ თავიდან.',
            4000,
            'error',
          );
        },
      });
  }

  backToForm(): void {
    this.step.set('form');
    this.verifySubmitted.set(false);
    this.verifyServerError.set('');
    this.clearResendTimer();
    this.resendCooldown.set(0);
    this.authTitleService.setTitle('რეგისტრაცია');
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
