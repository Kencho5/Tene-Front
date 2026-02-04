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

  getIndentLevel(label: string): number {
    const match = label.match(/^(—\s*)+/);
    if (!match) return 0;
    return (match[0].match(/—/g) || []).length;
  }

  getCleanLabel(label: string): string {
    return label.replace(/^(—\s*)+/, '');
  }

  readonly filteredItems = computed(() =>
    this.items().filter((item) => {
      const cleanLabel = this.getCleanLabel(item.label);
      return cleanLabel.toLowerCase().includes(this.searchValue().toLowerCase());
    }),
  );

  readonly itemLabel = computed(() => {
    const item = this.items().find((item) => item.value === this.selectedValue());
    if (!item) return '';
    return this.getCleanLabel(item.label);
  });

  selectItem(value: string) {
    const newValue = this.selectedValue() === value ? undefined : value;
    this.selectedValueChange.emit(newValue!);
    this.selectedValue.set(newValue);
    this.opened.set(false);
  }

  clearSearch() {
    this.searchValue.set('');
  }
}
