import { Component, inject } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { Navbar } from '../../components/navbar/navbar';
import { LoadingService } from '@core/services/loading.service';
import { Spinner } from '@shared/components/ui/spinner/spinner';

@Component({
  selector: 'app-main-layout',
  imports: [SharedModule, Navbar, Spinner],
  templateUrl: './main-layout.html',
})
export class MainLayout {
  public loadingService = inject(LoadingService);
}
