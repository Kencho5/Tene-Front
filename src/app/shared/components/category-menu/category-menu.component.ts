import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CategoriesService } from '@core/services/categories/categories.service';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';
import { SharedModule } from '@shared/shared.module';

/**
 * Reusable "All categories" mega-menu.
 *
 * Full-width mega panel: every top category is shown as a column with its
 * child links listed below, plus a promo strip. Selecting a category navigates
 * to `/search` with the relevant query params, so it can be triggered from
 * anywhere (navbar, search page…).
 *
 * Control it with the two-way bound `open` signal:
 *   <app-category-menu [(open)]="menuOpen" />
 */
@Component({
  selector: 'app-category-menu',
  imports: [SharedModule],
  templateUrl: './category-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes cm-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes cm-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes cm-slide-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes cm-slide-up {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `,
})
export class CategoryMenuComponent {
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);

  /** Two-way bound open state. */
  readonly open = model(false);

  readonly categoryTree = rxResource({
    defaultValue: [] as CategoryTreeNode[],
    params: () => (this.open() ? true : undefined),
    stream: ({ params }) => {
      if (!params) return of([] as CategoryTreeNode[]);
      return this.categoriesService.getCategoryTree().pipe(
        map((res) => {
          const priorityIds = [66, 2, 3, 9];
          const all = res.categories;
          const priority = priorityIds
            .map((id) => all.find((c) => c.id === id))
            .filter(Boolean) as CategoryTreeNode[];
          const rest = all.filter((c) => !priorityIds.includes(c.id));
          return [...priority, ...rest];
        }),
        catchError(() => of([] as CategoryTreeNode[])),
      );
    },
  });

  close(): void {
    this.open.set(false);
  }

  goToParent(category: CategoryTreeNode): void {
    this.close();
    this.router.navigate(['/search'], {
      queryParams: { parent_category_id: category.id },
    });
  }

  goToChild(childId: number): void {
    this.close();
    this.router.navigate(['/search'], {
      queryParams: { child_category_id: '' + childId },
    });
  }

  goToDiscounts(): void {
    this.close();
    this.router.navigate(['/search'], { queryParams: { sale_type: 'discount' } });
  }
}
