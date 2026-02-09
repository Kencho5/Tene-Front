import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '@core/services/auth/auth-service.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-profile-sidebar',
  imports: [SharedModule],
  templateUrl: './profile-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-full lg:w-[330px]' },
})
export class ProfileSidebarComponent {
  readonly authService = inject(AuthService);
  readonly isOpen = signal(false);

  toggle() {
    this.isOpen.update((v) => !v);
  }
}
