import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-about',
  imports: [SharedModule],
  templateUrl: './about.component.html',
})
export class AboutComponent {}
