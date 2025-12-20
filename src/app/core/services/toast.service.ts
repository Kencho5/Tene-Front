import { Injectable, signal } from '@angular/core';
import { ToastType, Toast } from '@core/interfaces/toast';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  add(title: string, subtext: string, duration = 2500, type: ToastType) {
    const id = Date.now();
    const toast: Toast = {
      id,
      title,
      subtext,
      duration,
      type,
    };

    this.toasts.update((toasts) => [toast, ...toasts]);

    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
