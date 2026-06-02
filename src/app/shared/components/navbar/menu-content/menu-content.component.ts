import { Component, computed, inject, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../../shared.module';
import { navUrls } from '@utils/navUrls';
import { CategoriesService } from '@core/services/categories/categories.service';
import {
  CategoryTreeNode,
  CategoryTreeResponse,
} from '@core/interfaces/categories.interface';

@Component({
  selector: 'app-menu-content',
  imports: [SharedModule],
  templateUrl: './menu-content.component.html',
})
export class MenuContentComponent {
  private readonly categoriesService = inject(CategoriesService);

  readonly linkClick = output<void>();

  readonly navUrls = navUrls.filter((nav) => nav.url !== 'coming-soon');

  readonly categories = rxResource({
    defaultValue: {} as CategoryTreeResponse,
    params: () => true,
    stream: () => this.categoriesService.getCategoryTree(),
  });

  readonly sortedCategories = computed<CategoryTreeNode[]>(() => {
    const all = this.categories.value().categories ?? [];
    const priorityIds = [66, 2, 3, 9];
    const priority = priorityIds
      .map((id) => all.find((c) => c.id === id))
      .filter(Boolean) as CategoryTreeNode[];
    const rest = all.filter((c) => !priorityIds.includes(c.id));
    return [...priority, ...rest];
  });
}
