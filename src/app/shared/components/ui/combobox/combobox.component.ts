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
import { ComboboxItems } from '@core/interfaces/combobox.interface';
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

  getIndentLevel(value: string): number {
    // Extract depth from value format "depth:id"
    const parts = value.split(':');
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
      return Number(parts[0]);
    }
    return 0;
  }

  getActualValue(value: string): string {
    // Extract actual ID from value format "depth:id"
    const parts = value.split(':');
    if (parts.length === 2) {
      return parts[1];
    }
    return value;
  }

  readonly filteredItems = computed(() =>
    this.items().filter((item) =>
      item.label.toLowerCase().includes(this.searchValue().toLowerCase()),
    ),
  );

  readonly itemLabel = computed(() => {
    const item = this.items().find((item) => item.value === this.selectedValue());
    if (!item) return '';
    return item.label;
  });

  selectItem(value: string) {
    const newValue = this.selectedValue() === value ? undefined : value;
    // Emit the actual value (without depth prefix)
    const actualValue = newValue ? this.getActualValue(newValue) : undefined;
    this.selectedValueChange.emit(actualValue!);
    this.selectedValue.set(newValue);
    this.opened.set(false);
  }

  clearSearch() {
    this.searchValue.set('');
  }
}
