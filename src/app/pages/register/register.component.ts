import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  NonNullableFormBuilder,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthTitleService } from '@core/services/auth-title.service';
import { AuthService } from '@core/services/auth-service.service';
import { AuthInputComponent } from '@shared/components/auth/auth-input/auth-input.component';
import { RegisterFields } from '@core/interfaces/auth.interface';
import { SharedModule } from '@shared/shared.module';
import { GoogleAuthService } from '@core/services/google-auth-service.service';

interface RegisterForm {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-register',
  imports: [SharedModule, AuthInputComponent, ReactiveFormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly authTitleService = inject(AuthTitleService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly isGoogleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly registerForm: FormGroup<RegisterForm> = this.fb.group({
    name: this.fb.control('', [Validators.required]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [
      Validators.required,
      Validators.minLength(4),
    ]),
  });

  ngOnInit(): void {
    this.authTitleService.setTitle('რეგისტრაცია');
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    this.isLoading.set(true);
    const userData: RegisterFields = this.registerForm.getRawValue();

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
