import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-not-found',
  imports: [SharedModule],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent {}
