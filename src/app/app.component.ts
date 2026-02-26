import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '@shared/components/ui/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private viewportScroller = inject(ViewportScroller);

  ngOnInit() {
    this.viewportScroller.setHistoryScrollRestoration('auto');

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.viewportScroller.scrollToPosition([0, 0]);
    });
  }
}
