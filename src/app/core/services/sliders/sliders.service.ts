import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Slider } from '@core/interfaces/admin/sliders.interface';

@Injectable({
  providedIn: 'root',
})
export class SlidersService {
  private readonly http = inject(HttpClient);

  getSliders(): Observable<Slider[]> {
    return this.http.get<Slider[]>('/sliders');
  }
}
