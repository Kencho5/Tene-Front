import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AddressData } from '@core/interfaces/address.interface';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private readonly http = inject(HttpClient);

  addAddress(data: AddressData): Observable<any> {
    return this.http.post('/add-address', data);
  }
}
