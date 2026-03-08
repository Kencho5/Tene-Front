import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategoryTreeResponse } from '@core/interfaces/categories.interface';
import { Observable, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private categoryTree$?: Observable<CategoryTreeResponse>;

  getCategoryTree(): Observable<CategoryTreeResponse> {
    if (!this.categoryTree$) {
      this.categoryTree$ = this.http
        .get<CategoryTreeResponse>('/categories/tree')
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.categoryTree$;
  }
}
