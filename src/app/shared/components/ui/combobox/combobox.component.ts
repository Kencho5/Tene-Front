import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  output,
  model,
} from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { FormsModule } from '@angular/forms';
import { ComboboxItems } from '@core/interfaces/combobox';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';

@Component({
  selector: 'app-combobox',
  imports: [SharedModule, FormsModule, OutsideClickDirective],
  templateUrl: './combobox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboboxComponent {
  readonly selectedValue = model<string | undefined>();
  readonly placeholder = input<string>('');
  readonly searchPlaceholder = input.required<string>();
  readonly notFoundText = input.required<string>();
  readonly error = input<boolean>(false);
  readonly customClass = input<string>('');
  readonly items = input.required<ComboboxItems[]>();

  readonly selectedValueChange = output<string>();

  readonly opened = signal<boolean>(false);
  readonly searchValue = signal<string>('');

  readonly filteredItems = computed(() =>
    this.items().filter((item) =>
      item.label.toLowerCase().includes(this.searchValue().toLowerCase()),
    ),
  );

  readonly itemLabel = computed(() => {
    return (
      this.items().find((item) => item.value === this.selectedValue())?.label || ''
    );
  });

  selectItem(value: string) {
    this.selectedValueChange.emit(value);
    this.selectedValue.set(value);
    this.opened.set(false);
  }

  clearSearch() {
    this.searchValue.set('');
  }
}
