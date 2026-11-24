import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { retailers } from '@utils/retailers';

@Component({
  selector: 'app-contact',
  imports: [SharedModule],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  readonly retailers = retailers;
}
