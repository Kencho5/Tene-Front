import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

@Injectable({
  providedIn: 'root',
})
export class MetaPixelService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isProd = environment.branch == 'main';
  private readonly pixelId = '1152942183623103';

  init(): void {
    if (!this.isBrowser || !this.isProd || window.fbq) {
      return;
    }

    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq ??= fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    fbq('init', this.pixelId);
  }

  track(event: string, params?: Record<string, unknown>): void {
    if (this.isBrowser) {
      window.fbq?.('track', event, params);
    }
  }
}
