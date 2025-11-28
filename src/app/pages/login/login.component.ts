import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AuthTitleService } from '@core/services/auth-title.service';
import { AuthInputComponent } from '@shared/components/auth/auth-input/auth-input.component';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@core/services/auth-service.service';
import { GoogleAuthService } from '@core/services/google-auth-service.service';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginFields } from '@core/interfaces/auth.interface';
import { SharedModule } from '@shared/shared.module';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  imports: [SharedModule, AuthInputComponent, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly authTitleService = inject(AuthTitleService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm: FormGroup<LoginForm> = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [
      Validators.required,
      Validators.minLength(4),
    ]),
  });

  constructor() {
    this.authTitleService.setTitle('ავტორიზაცია');
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    this.isLoading.set(true);
    const userData: LoginFields = this.loginForm.getRawValue();

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
