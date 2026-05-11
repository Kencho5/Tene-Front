import { Injectable, signal } from '@angular/core';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  loading = signal(false);

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      switch (true) {
        case event instanceof NavigationStart: {
          // Ignore same-path navigations (query param updates) so spinner
          // doesn't fire when in-page state (e.g. variant slider) syncs to URL.
          const current = this.router.url.split('?')[0];
          const next = (event as NavigationStart).url.split('?')[0];
          if (current === next) return;
          this.loading.set(true);
          break;
        }
        case event instanceof NavigationEnd:
        case event instanceof NavigationCancel:
        case event instanceof NavigationError:
          this.loading.set(false);
          break;
      }
    });
  }
}
