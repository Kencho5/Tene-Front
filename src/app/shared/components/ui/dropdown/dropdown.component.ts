import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
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
  readonly fixedPanel = input<boolean>(false);

  readonly selectedValueChange = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>);

  readonly opened = signal<boolean>(false);
  readonly panelTop = signal<number>(0);
  readonly panelLeft = signal<number>(0);
  readonly panelWidth = signal<number>(0);

  readonly itemLabel = computed(() => {
    return (
      this.items().find((item) => item.value === this.selectedValue())?.label ||
      ''
    );
  });

  toggle(): void {
    if (this.disabled()) return;
    const next = !this.opened();
    if (next && this.fixedPanel()) this.updatePanelPosition();
    this.opened.set(next);
  }

  private updatePanelPosition(): void {
    const trigger = this.host.nativeElement.querySelector('button');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    this.panelTop.set(rect.bottom + 4);
    this.panelLeft.set(rect.left);
    this.panelWidth.set(rect.width);
  }

  selectItem(value: string): void {
    const item = this.items().find((i) => i.value === value);
    if (item?.disabled) return;
    const newValue = this.selectedValue() === value ? undefined : value;
    this.selectedValueChange.emit(newValue!);
    this.selectedValue.set(newValue);
    this.opened.set(false);
  }
}
