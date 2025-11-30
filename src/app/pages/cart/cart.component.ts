import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-cart',
  imports: [SharedModule],
  templateUrl: './cart.component.html',
})
export class CartComponent {}
