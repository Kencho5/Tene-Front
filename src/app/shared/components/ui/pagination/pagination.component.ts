import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '../dropdown/dropdown.component';

@Component({
  selector: 'app-pagination',
  imports: [DropdownComponent],
  templateUrl: './pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  totalItems = input.required<number>();
  showingFrom = input.required<number>();
  showingTo = input.required<number>();
  limit = input.required<number>();

  pageChange = output<number>();
  limitChange = output<string>();

  readonly limitOptions: ComboboxItems[] = [
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' },
    { label: '100', value: '100' },
  ];

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, -1, total];
    }

    if (current >= total - 3) {
      return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, -1, current - 1, current, current + 1, -1, total];
  });

  goToPage(page: number): void {
    this.pageChange.emit(page);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  onLimitChange(value: string | undefined): void {
    this.limitChange.emit(value || '10');
  }
}
