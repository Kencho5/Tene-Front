import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ProductsService } from '@core/services/products/products.service';
import { SharedModule } from '@shared/shared.module';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [SharedModule],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private debounceTimer?: number;

  readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });

  readonly products = toSignal(
    this.route.queryParams.pipe(
      map(params => new URLSearchParams(params).toString()),
      switchMap(query => this.productsService.searchProduct(query))
    ),
    { initialValue: [] }
  );

  setParam(key: string, value: string | undefined, debounce = 0): void {
    if (debounce > 0) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.updateParam(key, value);
      }, debounce);
    } else {
      this.updateParam(key, value);
    }
  }

  private updateParam(key: string, value: string | undefined): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
    });
  }

  toggleParam(key: string, value: string, checked: boolean): void {
    const current = this.params()[key] as string | undefined;
    const values = current ? current.split(',') : [];
    const updated = checked
      ? [...values, value]
      : values.filter((v: string) => v !== value);

    this.setParam(key, updated.length ? updated.join(',') : undefined);
  }

  hasValue(key: string, value: string): boolean {
    const current = this.params()[key] as string | undefined;
    return current ? current.split(',').includes(value) : false;
  }

  clearAll(): void {
    this.router.navigate([], { relativeTo: this.route });
  }
}
