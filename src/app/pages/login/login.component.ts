import { Component, inject, OnInit } from '@angular/core';
import { AuthTitleService } from '@core/services/auth-title.service';
import { AuthInputComponent } from '@shared/components/auth/auth-input/auth-input.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [AuthInputComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private authTitleService = inject(AuthTitleService);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
    ]),
  });

  submitted: boolean = false;

  ngOnInit() {
    this.authTitleService.setTitle('ავტორიზაცია');
  }
}
