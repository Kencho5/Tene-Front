import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-auth-input',
  imports: [ReactiveFormsModule, SharedModule],
  templateUrl: './auth-input.component.html',
})
export class AuthInputComponent {
  @Input() control = new FormControl();
  @Input() type: string = 'text';
  @Input() placeholder!: string;
  @Input() error?: boolean;
  @Input() customClass: string = '';
}
