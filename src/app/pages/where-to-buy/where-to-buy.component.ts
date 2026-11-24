import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { retailers } from '@utils/retailers';

@Component({
  selector: 'app-where-to-buy',
  imports: [SharedModule],
  templateUrl: './where-to-buy.component.html',
})
export class WhereToBuyComponent {
  readonly retailers = retailers;
}
