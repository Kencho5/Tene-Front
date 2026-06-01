import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SharedModule } from '../../shared.module';
import { LoadingService } from '@core/services/loading.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { FooterComponent } from '@shared/components/footer/footer.component';

@Component({
  selector: 'app-main-layout',
  imports: [SharedModule, NavbarComponent, SpinnerComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  host: { class: 'block overflow-x-hidden' },
})
export class MainLayoutComponent {
  public loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0] === '/'),
      startWith(this.router.url.split('?')[0] === '/'),
    ),
    { initialValue: this.router.url.split('?')[0] === '/' },
  );
}
