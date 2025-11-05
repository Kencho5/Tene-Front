import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-auth-input',
  imports: [ReactiveFormsModule, SharedModule],
  templateUrl: './auth-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthInputComponent {
  readonly control = input.required<FormControl<string>>();
  readonly type = input<string>('text');
  readonly placeholder = input.required<string>();
  readonly error = input<boolean>(false);
  readonly customClass = input<string>('');
}
