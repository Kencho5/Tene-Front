import {
  Component,
  inject,
  signal,
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

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

  constructor() {
    this.authTitleService.setTitle('ავტორიზაცია');
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.errorMessage.set(null);

    submit(this.loginForm, async () => {
      this.submitted.set(true);
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
            this.errorMessage.set(
              errorResponse.error.error ||
                'ავტორიზაცია ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.',
            );
          },
        });
    });

    if (this.loginForm().invalid()) {
      this.errorMessage.set('გთხოვთ შეავსოთ ყველა ველი');
    }
  }

  authorizeWithGoogle(): void {
    this.errorMessage.set(null);
    this.isGoogleLoading.set(true);

    this.googleAuthService
      .init()
      .catch((_) => {
        this.errorMessage.set('Google-ით შესვლა ვერ მოხერხდა');
      })
      .finally(() => {
        this.isGoogleLoading.set(false);
      });
  }
}
