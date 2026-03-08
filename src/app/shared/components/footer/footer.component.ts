import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { CategoriesService } from '@core/services/categories/categories.service';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';

@Component({
  selector: 'app-footer',
  imports: [SharedModule],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  private readonly categoriesService = inject(CategoriesService);

  titles = ['სერვისები', 'მაღაზიები', 'დოკუმენტაცია', 'კომპანია'] as const;

  readonly categoryTree = rxResource({
    defaultValue: [] as CategoryTreeNode[],
    stream: () =>
      this.categoriesService.getCategoryTree().pipe(
        map((res) => res.categories),
        catchError(() => of([] as CategoryTreeNode[])),
      ),
  });

  readonly categoryLinks = computed(() =>
    this.categoryTree.value().slice(0, 8).map((cat) => ({
      label: cat.name,
      route: `/category/${cat.slug}`,
    })),
  );

  links: Record<string, { label: string; route: string }[]> = {
    სერვისები: [
      { label: 'მწვანე ურნა', route: '/bins' },
      { label: 'ტენე ქოინები', route: '/coming-soon' },
      { label: 'პროდუქტები', route: '/products' },
      { label: 'გადადნობა', route: '/coming-soon' },
      { label: 'გამომუშავება', route: '/coming-soon' },
    ],
    მაღაზიები: [
      { label: 'თბილისი', route: '/store/tbilisi' },
      { label: 'ბათუმი', route: '/store/batumi' },
      { label: 'ქუთაისი', route: '/store/kutaisi' },
      { label: 'რუსთავი', route: '/store/rustavi' },
      { label: 'ფოთი', route: '/store/poti' },
    ],
    დოკუმენტაცია: [
      { label: 'წესები და პირობები', route: '/coming-soon' },
      { label: 'ანგარიშსწორება', route: '/coming-soon' },
      { label: 'მიწოდების პირობები', route: '/coming-soon' },
      { label: 'ნივთის დაბრუნება', route: '/coming-soon' },
      { label: 'კონფიდენციალურობა', route: '/coming-soon' },
    ],
    კომპანია: [
      { label: 'ჩვენ შესახებ', route: '/coming-soon' },
      { label: 'ბლოგი', route: '/coming-soon' },
      { label: 'კონტაქტი', route: '/contact' },
    ],
  };
}
