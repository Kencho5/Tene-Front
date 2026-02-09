import { Component } from '@angular/core';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { ProfileSidebarComponent } from '@shared/components/profile-sidebar/profile-sidebar.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-profile-layout',
  imports: [SharedModule, NavbarComponent, ProfileSidebarComponent],
  templateUrl: './profile-layout.component.html',
})
export class ProfileLayoutComponent {}
