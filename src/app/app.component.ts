import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter, pairwise } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '@shared/components/ui/toast/toast.component';
import { PosthogService } from '@core/services/posthog.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private viewportScroller = inject(ViewportScroller);
  private posthog = inject(PosthogService);

  ngOnInit() {
    this.posthog.init();
    this.viewportScroller.setHistoryScrollRestoration('auto');

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        pairwise(),
      )
      .subscribe(([prev, curr]) => {
        if (prev.urlAfterRedirects.split('?')[0] !== curr.urlAfterRedirects.split('?')[0]) {
          this.viewportScroller.scrollToPosition([0, 0]);
        }
      });
  }
}
