import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { SearchFilters } from '@core/interfaces/search.interface';

@Component({
  selector: 'app-search',
  imports: [SharedModule],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly filters = computed<SearchFilters>(() => {
    const params = this.queryParams();
    return {
      priceFrom: params['priceFrom'],
      priceTo: params['priceTo'],
      saleType: params['saleType'],
      brand: params['brand'],
      color: params['color'],
    };
  });

  readonly activeFilters = computed(
    () =>
      Object.fromEntries(
        Object.entries(this.filters()).filter(
          ([_, value]) => value !== undefined,
        ),
      ) as Partial<SearchFilters>,
  );

  readonly activeFilterCount = computed(
    () => Object.keys(this.activeFilters()).length,
  );

  updateQueryParams(params: Partial<SearchFilters>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  clearQueryParams(keys?: (keyof SearchFilters)[]): void {
    if (!keys) {
      this.router.navigate([], { relativeTo: this.route });
      return;
    }

    const currentParams = { ...this.queryParams() };
    keys.forEach((key) => delete currentParams[key]);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
    });
  }
}
