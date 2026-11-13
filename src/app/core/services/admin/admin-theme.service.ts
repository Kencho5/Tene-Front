import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'admin-theme';

@Injectable({
  providedIn: 'root',
})
export class AdminThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly dark = signal(this.readInitial());

  constructor() {
    effect(() => {
      const dark = this.dark();
      if (!this.isBrowser) return;
      try {
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
      } catch {}
    });
  }

  toggle(): void {
    this.dark.update((dark) => !dark);
  }

  private readInitial(): boolean {
    if (!this.isBrowser) return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored === 'dark';
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
