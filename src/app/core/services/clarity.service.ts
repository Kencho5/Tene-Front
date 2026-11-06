import { Injectable, inject, PLATFORM_ID, DOCUMENT } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: Clarity;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ClarityService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isProd = environment.branch == 'main';

  init(): void {
    const window = this.document.defaultView;
    if (!this.isBrowser || !this.isProd || !window || window.clarity) {
      return;
    }

    if (!environment.clarity_id) {
      console.warn('Clarity project ID not found in environment');
      return;
    }

    const clarity: Clarity = (...args: unknown[]) => {
      (clarity.q ??= []).push(args);
    };
    window.clarity = clarity;

    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${environment.clarity_id}`;
    this.document.head.appendChild(script);
  }

  identify(userId: string, friendlyName?: string): void {
    this.document.defaultView?.clarity?.('identify', userId, undefined, undefined, friendlyName);
  }

  set(key: string, value: string | string[]): void {
    this.document.defaultView?.clarity?.('set', key, value);
  }
}
