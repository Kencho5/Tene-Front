import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule, SharedModule],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly control = input.required<FormControl<string>>();
  readonly type = input<string>('text');
  readonly placeholder = input.required<string>();
  readonly error = input<boolean>(false);
  readonly customClass = input<string>('');
}
