import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-multi-dropdown',
  imports: [SharedModule, OutsideClickDirective],
  templateUrl: './multi-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiDropdownComponent {
  readonly selectedValues = input<string[]>([]);
  readonly placeholder = input<string>('');
  readonly items = input.required<ComboboxItems[]>();
  readonly disabled = input<boolean>(false);

  readonly selectedValuesChange = output<string[]>();

  readonly opened = signal<boolean>(false);

  readonly triggerLabel = computed(() => {
    const selected = this.selectedValues();
    if (selected.length === 0) return this.placeholder();

    const labels = this.items()
      .filter((item) => selected.includes(item.value))
      .map((item) => item.label);

    if (labels.length === 0) return this.placeholder();
    if (labels.length === 1) return labels[0];
    return `${labels.length} არჩეული`;
  });

  isSelected(value: string): boolean {
    return this.selectedValues().includes(value);
  }

  toggle(): void {
    if (this.disabled()) return;
    this.opened.update((o) => !o);
  }

  toggleItem(value: string): void {
    const item = this.items().find((i) => i.value === value);
    if (item?.disabled) return;

    const selected = this.selectedValues();
    this.selectedValuesChange.emit(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.selectedValuesChange.emit([]);
  }
}
