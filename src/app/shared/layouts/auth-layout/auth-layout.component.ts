import { Component, inject } from '@angular/core';
import { AuthTitleService } from '@core/services/auth/auth-title.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-auth-layout',
  imports: [SharedModule],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  authTitleService = inject(AuthTitleService);

  title = this.authTitleService.title;
}
