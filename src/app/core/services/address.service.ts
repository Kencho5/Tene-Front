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

  updateAddress(id: number, data: AddressData): Observable<AddressData> {
    return this.http.put<AddressData>(`/addresses/${id}`, data);
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`/addresses/${id}`);
  }

  getAddresses(): Observable<AddressData[]> {
    return this.http.get<AddressData[]>('/addresses');
  }
}
