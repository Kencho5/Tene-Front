import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-dropdown',
  imports: [SharedModule, OutsideClickDirective],
  templateUrl: './dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  readonly selectedValue = model<string | undefined>();
  readonly placeholder = input<string>('');
  readonly error = input<boolean>(false);
  readonly customClass = input<string>('');
  readonly items = input.required<ComboboxItems[]>();
  readonly disabled = input<boolean>(false);

  readonly selectedValueChange = output<string>();

  readonly opened = signal<boolean>(false);

  readonly itemLabel = computed(() => {
    return (
      this.items().find((item) => item.value === this.selectedValue())?.label ||
      ''
    );
  });

  selectItem(value: string): void {
    const newValue = this.selectedValue() === value ? undefined : value;
    this.selectedValueChange.emit(newValue!);
    this.selectedValue.set(newValue);
    this.opened.set(false);
  }
}
