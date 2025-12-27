import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AddressData } from '@core/interfaces/address.interface';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private readonly http = inject(HttpClient);

  addAddress(data: AddressData): Observable<AddressData> {
    return this.http.post<AddressData>('/addresses', data);
  }

  getAddresses(): Observable<AddressData[]> {
    return this.http.get<AddressData[]>('/addresses');
  }
}
