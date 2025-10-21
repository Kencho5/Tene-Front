import { Component, inject } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { LoadingService } from '@core/services/loading.service';
import { Spinner } from '@shared/components/ui/spinner/spinner';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  imports: [SharedModule, NavbarComponent, Spinner],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  public loadingService = inject(LoadingService);
}
