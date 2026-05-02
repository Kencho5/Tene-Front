import { Component, inject } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { LoadingService } from '@core/services/loading.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { FreeShippingBarComponent } from '@shared/components/free-shipping-bar/free-shipping-bar.component';
import { FreeShippingBarService } from '@core/services/free-shipping-bar.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    SharedModule,
    NavbarComponent,
    SpinnerComponent,
    FooterComponent,
    FreeShippingBarComponent,
  ],
  templateUrl: './main-layout.component.html',
  host: { class: 'block overflow-x-hidden' },
})
export class MainLayoutComponent {
  public loadingService = inject(LoadingService);
  public bar = inject(FreeShippingBarService);
}
