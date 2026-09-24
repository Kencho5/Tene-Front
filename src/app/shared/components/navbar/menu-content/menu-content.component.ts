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
    return this.categories.value().categories ?? [];
  });
}
