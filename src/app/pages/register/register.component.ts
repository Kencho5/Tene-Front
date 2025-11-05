import { Component, inject, OnInit } from '@angular/core';
import { AuthTitleService } from '@core/services/auth-title.service';
import { AuthInputComponent } from '@shared/components/auth/auth-input/auth-input.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [AuthInputComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  private authTitleService = inject(AuthTitleService);

  loginForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
    ]),
  });

  submitted: boolean = false;

  ngOnInit() {
    this.authTitleService.setTitle('რეგისტრაცია');
  }
}
