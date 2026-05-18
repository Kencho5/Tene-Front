import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FreeShippingBarService {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly dismissed = signal(false);

  readonly visible = computed(() => {
    if (this.dismissed()) return false;
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return !url.startsWith('/cart') && !url.startsWith('/checkout');
  });

  dismiss(): void {
    this.dismissed.set(true);
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
