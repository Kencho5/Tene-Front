import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

const DISMISSED_KEY = 'free_ship_bar_dismissed';

@Injectable({ providedIn: 'root' })
export class FreeShippingBarService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly currentUrl = signal(this.router.url);
  private readonly dismissed = signal(
    this.isBrowser ? localStorage.getItem(DISMISSED_KEY) === '1' : false,
  );

  readonly visible = computed(() => {
    if (this.dismissed()) return false;
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return !url.startsWith('/cart') && !url.startsWith('/checkout');
  });

  dismiss(): void {
    this.dismissed.set(true);
    if (this.isBrowser) localStorage.setItem(DISMISSED_KEY, '1');
  }

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));
  }
}
