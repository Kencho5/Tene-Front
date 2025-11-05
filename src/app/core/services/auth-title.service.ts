import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthTitleService {
  private titleSignal = signal<string>('');

  readonly title = this.titleSignal.asReadonly();

  setTitle(title: string) {
    this.titleSignal.set(title);
  }
}
