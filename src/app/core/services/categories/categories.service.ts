import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategoryTreeResponse } from '@core/interfaces/categories.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly http = inject(HttpClient);

  getCategoryTree(): Observable<CategoryTreeResponse> {
    return this.http.get<CategoryTreeResponse>('/categories/tree');
  }
}
