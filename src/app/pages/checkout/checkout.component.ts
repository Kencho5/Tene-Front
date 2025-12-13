import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-checkout',
  imports: [SharedModule],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {}
