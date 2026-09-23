import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PhoneNumber } from '@core/interfaces/phone-number.interface';

export const PHONE_CODE_RESEND_SECONDS = 60;

@Injectable({
  providedIn: 'root',
})
export class PhoneNumberService {
  private readonly http = inject(HttpClient);

  readonly resendAvailableAt = signal<Record<string, number>>({});

  sendCode(phoneNumber: string): Observable<void> {
    return this.http
      .post<void>('/phone/send-code', { phone_number: phoneNumber })
      .pipe(tap({ next: () => this.startCooldown(phoneNumber) }));
  }

  startCooldown(phoneNumber: string): void {
    this.resendAvailableAt.update((map) => ({
      ...map,
      [phoneNumber]: Date.now() + PHONE_CODE_RESEND_SECONDS * 1000,
    }));
  }

  getPhoneNumbers(): Observable<PhoneNumber[]> {
    return this.http.get<PhoneNumber[]>('/phone-numbers');
  }

  addPhoneNumber(phoneNumber: string): Observable<PhoneNumber> {
    return this.http.post<PhoneNumber>('/phone-numbers', { phone_number: phoneNumber });
  }

  updatePhoneNumber(id: number, phoneNumber: string): Observable<PhoneNumber> {
    return this.http.put<PhoneNumber>(`/phone-numbers/${id}`, { phone_number: phoneNumber });
  }

  deletePhoneNumber(id: number): Observable<PhoneNumber> {
    return this.http.delete<PhoneNumber>(`/phone-numbers/${id}`);
  }

  verifyPhoneNumber(phoneNumber: string, code: number): Observable<PhoneNumber> {
    return this.http.post<PhoneNumber>('/phone-numbers/verify', {
      phone_number: phoneNumber,
      code,
    });
  }
}
