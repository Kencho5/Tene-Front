import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  form,
  Field,
  required,
  email,
  minLength,
  submit,
} from '@angular/forms/signals';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthTitleService } from '@core/services/auth/auth-title.service';
import { AuthService } from '@core/services/auth/auth-service.service';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { RegisterFields } from '@core/interfaces/auth.interface';
import { SharedModule } from '@shared/shared.module';
import { GoogleAuthService } from '@core/services/auth/google-auth-service.service';

@Component({
  selector: 'app-register',
  imports: [SharedModule, InputComponent, Field],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly authTitleService = inject(AuthTitleService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

  constructor() {
    this.authTitleService.setTitle('რეგისტრაცია');
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.errorMessage.set(null);

    submit(this.registerForm, async () => {
      this.submitted.set(true);
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
            this.errorMessage.set(
              errorResponse.error.error ||
                'რეგისტრაცია ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.',
            );
          },
        });
    });

    if (this.registerForm().invalid()) {
      this.errorMessage.set('გთხოვთ შეავსოთ ყველა ველი');
    }
  }

  authorizeWithGoogle(): void {
    this.errorMessage.set(null);
    this.isGoogleLoading.set(true);

    this.googleAuthService
      .init()
      .catch((_) => {
        this.errorMessage.set('Google-ით რეგისტრაცია ვერ მოხერხდა');
      })
      .finally(() => {
        this.isGoogleLoading.set(false);
      });
  }
}
