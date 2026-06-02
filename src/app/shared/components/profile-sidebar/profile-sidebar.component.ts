import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/services/auth/auth-service.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-profile-sidebar',
  imports: [SharedModule],
  templateUrl: './profile-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class ProfileSidebarComponent {
  readonly authService = inject(AuthService);

  readonly initials = computed(() => {
    const name = this.authService.user()?.name?.trim() ?? '';
    if (!name) return '?';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + second).toUpperCase();
  });
}
