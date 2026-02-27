import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormField, FieldTree } from '@angular/forms/signals';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-input',
  imports: [FormField, SharedModule],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly formField = input.required<FieldTree<string | number | null>>();
  readonly type = input<string>('text');
  readonly placeholder = input.required<string>();
  readonly customClass = input<string>('');
  readonly error = input<boolean>(false);
}
