import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter, pairwise } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '@shared/components/ui/toast/toast.component';
import { PosthogService } from '@core/services/posthog.service';
import { MetaPixelService } from '@core/services/meta-pixel.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private viewportScroller = inject(ViewportScroller);
  private posthog = inject(PosthogService);
  private metaPixel = inject(MetaPixelService);

  ngOnInit() {
    this.posthog.init();
    this.metaPixel.init();
    this.viewportScroller.setHistoryScrollRestoration('auto');

    const navigationEnd$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    );

    navigationEnd$.subscribe(() => this.metaPixel.track('PageView'));

    navigationEnd$
      .pipe(
        pairwise(),
      )
      .subscribe(([prev, curr]) => {
        if (prev.urlAfterRedirects.split('?')[0] !== curr.urlAfterRedirects.split('?')[0]) {
          this.viewportScroller.scrollToPosition([0, 0]);
        }
      });
  }
}
