import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-input',
  imports: [Field, SharedModule],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  readonly field = input.required<FieldTree<string>>();
  readonly type = input<string>('text');
  readonly placeholder = input.required<string>();
  readonly customClass = input<string>('');
  readonly error = input<boolean>(false);
}
