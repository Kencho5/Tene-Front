import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-orders',
  imports: [SharedModule],
  templateUrl: './orders.component.html',
})
export class OrdersComponent {}
