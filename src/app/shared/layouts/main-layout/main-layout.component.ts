import { Component, inject } from '@angular/core';
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
}
